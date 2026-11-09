import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { extractedContentSchema } from "@xtrakto/core";
import {
  createDb,
  type DbClient,
  findOrCreateUser,
  saveNoticePreference,
  type UserId,
  withUserContext,
} from "@xtrakto/db";
import { requireTestDatabase, testDatabase } from "@xtrakto/db/testing";
import { findParser } from "@xtrakto/parsers";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { EXAMPLE_CLERK_USER_ID } from "@/lib/example-mode";
import { inngest } from "@/lib/inngest";
import { monthExport, uploadContent } from "../../../test/month-exports";
import {
  queueMonthlySummaryEmails,
  sendMonthlySummary,
} from "./monthly-summary.service";
import { readUnsubscribeToken } from "./unsubscribe-token.helpers";

const HASH_KEY = "test-key-with-at-least-32-characters!";
const ADDRESS = "ana.prueba@correo.test";
const OCTOBER = { year: 2026, month: 10 };
const BILL = "PAGO PSE EMPRESA DE ENERGIA";

// Against the test database, as the application role, after real uploads;
// Resend and Clerk never.
const mocks = vi.hoisted(() => ({
  database: { current: undefined as unknown },
  sendEmail: vi.fn(),
  getUser: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ getDb: () => mocks.database.current }));
vi.mock("@/lib/env", () => ({
  getServerEnv: () => ({ IDENTIFIER_HASH_KEY: HASH_KEY }),
}));
vi.mock("@/lib/email", () => ({ sendEmail: mocks.sendEmail }));
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
  clerkClient: async () => ({ users: { getUser: mocks.getUser } }),
}));

// A quarterly statement as the browser sends it, for July to September.
const quarterlyFixture = () => {
  const content = extractedContentSchema.parse(
    JSON.parse(
      readFileSync(
        new URL(
          "../../../../../packages/parsers/fixtures/quarterly-basic.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ),
  );
  const parser = findParser(content);
  if (!parser.ok) throw new Error("No parser recognizes the fixture.");
  return parser.value.minimize(content);
};

describe.skipIf(!testDatabase)("the monthly email", () => {
  let app: DbClient;
  const send = vi.spyOn(inngest, "send");

  beforeAll(() => {
    vi.useFakeTimers({
      toFake: ["Date"],
      now: new Date("2026-11-01T13:00:00Z"),
    });
    app = createDb({ connectionString: requireTestDatabase().appUrl });
    mocks.database.current = app.db;
  });

  afterAll(async () => {
    vi.useRealTimers();
    await app.pool.end();
  });

  beforeEach(() => {
    vi.setSystemTime(new Date("2026-11-01T13:00:00Z"));
    send.mockReset();
    send.mockResolvedValue({ ids: [] });
    mocks.sendEmail.mockReset();
    mocks.getUser.mockReset();
    mocks.sendEmail.mockResolvedValue({ ok: true, value: undefined });
    mocks.getUser.mockResolvedValue({
      primaryEmailAddress: { emailAddress: ADDRESS },
    });
  });

  const newUser = (clerkId = `test_${randomUUID()}`) =>
    findOrCreateUser(app.db, clerkId);

  const turnOn = (userId: UserId, isOn = true) =>
    withUserContext(app.db, userId, (ctx) =>
      saveNoticePreference(ctx, "monthlySummary", isOn),
    );

  const personWhoAsked = async () => {
    const userId = await newUser();
    await turnOn(userId);
    return userId;
  };

  const queuedEvents = () => {
    const [events] = send.mock.calls[0] ?? [];
    return Array.isArray(events) ? events : [];
  };

  const emailOf = async (userId: UserId, month = "2026-10") => {
    const outcome = await sendMonthlySummary(userId, month);
    const [message] = mocks.sendEmail.mock.calls[0] ?? [];
    return { outcome, message };
  };

  describe("who it's queued for", () => {
    it("is everyone who asked, each with an event of their own", async () => {
      const [ana, bruno, carla] = [
        await personWhoAsked(),
        await personWhoAsked(),
        await newUser(),
      ];

      const { people } = await queueMonthlySummaryEmails();

      const events = queuedEvents();
      expect(events).toHaveLength(people);
      expect(events).toContainEqual(
        expect.objectContaining({
          name: "monthly-summary/due",
          data: { userId: ana, month: "2026-10" },
          id: `monthly-summary-2026-10-${ana}`,
        }),
      );
      expect(events.map((event) => event.data?.userId)).toEqual(
        expect.arrayContaining([ana, bruno]),
      );
      expect(events.map((event) => event.data?.userId)).not.toContain(carla);
    });

    it("leaves out who turned it off", async () => {
      const userId = await personWhoAsked();
      await turnOn(userId, false);

      await queueMonthlySummaryEmails();

      expect(queuedEvents().map((event) => event.data?.userId)).not.toContain(
        userId,
      );
    });

    it("reads the month that ended in Bogotá", async () => {
      await personWhoAsked();
      vi.setSystemTime(new Date("2026-11-01T04:59:00Z"));

      await queueMonthlySummaryEmails();

      expect(queuedEvents()[0]?.data?.month).toBe("2026-09");
    });
  });

  describe("what it says", () => {
    it("links the month's summary when a file reaches its last day", async () => {
      const userId = await personWhoAsked();
      await uploadContent(
        app.db,
        userId,
        monthExport(OCTOBER, [
          [5, BILL, -130_000],
          [31, "ABONO INTERESES AHORROS", 4.32],
        ]),
      );

      const { outcome, message } = await emailOf(userId);

      expect(outcome).toEqual({ status: "sent" });
      expect(message).toMatchObject({
        to: ADDRESS,
        subject: "Tu resumen de octubre está listo",
        idempotencyKey: `monthly-summary/${userId}/2026-10`,
      });
      expect(message.text).toContain("period=2026-10");
      for (const body of [message.subject, message.text, message.html])
        for (const secret of ["130.000", "130000", "EMPRESA", "ENERGIA"])
          expect(body).not.toContain(secret);
    });

    it("takes a month a verified quarterly statement covers", async () => {
      const userId = await personWhoAsked();
      await uploadContent(app.db, userId, quarterlyFixture());

      const { message } = await emailOf(userId, "2026-09");

      expect(message.subject).toBe("Tu resumen de septiembre está listo");
    });

    it("asks for what's left of a month that doesn't reach its last day", async () => {
      const userId = await personWhoAsked();
      await uploadContent(
        app.db,
        userId,
        monthExport(OCTOBER, [[15, BILL, -130_000]]),
      );

      const { message } = await emailOf(userId);

      expect(message.subject).toBe("Te falta parte de octubre");
      expect(message.text).toContain("sube los movimientos de octubre.");
    });

    it("says which file to download without the month's movements", async () => {
      const userId = await personWhoAsked();
      await uploadContent(
        app.db,
        userId,
        monthExport({ year: 2026, month: 9 }, [[30, BILL, -130_000]]),
      );

      const { message } = await emailOf(userId);

      expect(message.subject).toBe("Te falta octubre");
      expect(message.text).toContain("sube los movimientos de octubre.");
    });

    it("says which file to someone with no file yet", async () => {
      const { message } = await emailOf(await personWhoAsked());

      expect(message.subject).toBe("Te falta octubre");
    });

    it("turns off only its own notice from its link", async () => {
      const { message } = await emailOf(await personWhoAsked());

      expect(
        readUnsubscribeToken(
          new URL(message.oneClickUrl).searchParams.get("token") ?? "",
          HASH_KEY,
        )?.notices,
      ).toEqual(["monthlySummary"]);
    });
  });

  describe("who never gets it", () => {
    it("is someone who turned it off after it was queued", async () => {
      const userId = await personWhoAsked();
      await turnOn(userId, false);

      await expect(sendMonthlySummary(userId, "2026-10")).resolves.toEqual({
        status: "not-sent",
        code: "NOTICE_OFF",
      });
      expect(mocks.sendEmail).not.toHaveBeenCalled();
    });

    it("is the example's user, even with the notice on", async () => {
      const userId = await newUser(EXAMPLE_CLERK_USER_ID);
      await turnOn(userId);

      await expect(sendMonthlySummary(userId, "2026-10")).resolves.toEqual({
        status: "not-sent",
        code: "EXAMPLE",
      });
      expect(mocks.getUser).not.toHaveBeenCalled();
      expect(mocks.sendEmail).not.toHaveBeenCalled();
    });

    it("is someone without an address", async () => {
      mocks.getUser.mockResolvedValue({ primaryEmailAddress: null });

      await expect(
        sendMonthlySummary(await personWhoAsked(), "2026-10"),
      ).resolves.toEqual({ status: "not-sent", code: "NO_ADDRESS" });
    });
  });

  describe("a failure", () => {
    it("for one person leaves the next one's email to go", async () => {
      const [ana, bruno] = [await personWhoAsked(), await personWhoAsked()];
      mocks.getUser.mockRejectedValueOnce(new Error(`no user ${ADDRESS}`));

      await expect(sendMonthlySummary(ana, "2026-10")).rejects.toThrow(
        "MONTHLY_SUMMARY_NOT_SENT",
      );
      await expect(sendMonthlySummary(bruno, "2026-10")).resolves.toEqual({
        status: "sent",
      });
    });

    it("is thrown without an address, to try again what may pass", async () => {
      mocks.sendEmail.mockResolvedValue({
        ok: false,
        error: {
          code: "EMAIL_FAILED",
          reason: "rate_limit_exceeded",
          isTransient: true,
        },
      });

      const failure = await sendMonthlySummary(
        await personWhoAsked(),
        "2026-10",
      ).catch((error: unknown) => String(error));

      expect(failure).toContain("MONTHLY_SUMMARY_NOT_SENT");
      expect(failure).not.toContain(ADDRESS);
    });
  });
});
