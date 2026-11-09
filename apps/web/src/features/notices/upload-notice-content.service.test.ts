import { randomUUID } from "node:crypto";
import type { ExtractedContent } from "@xtrakto/core";
import {
  createDb,
  type DbClient,
  findOrCreateUser,
  type NoticeId,
  readNoticePreferences,
  saveNoticePreference,
  type UserId,
  withUserContext,
} from "@xtrakto/db";
import { requireTestDatabase, testDatabase } from "@xtrakto/db/testing";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  type ExportRow,
  monthExport,
  uploadContent,
} from "../../../test/month-exports";
import {
  claimUploadNotice,
  sendUploadNotice,
  turnNoticeOff,
} from "./notices.service";
import { readUnsubscribeToken } from "./unsubscribe-token.helpers";

const HASH_KEY = "test-key-with-at-least-32-characters!";
const BILL = "PAGO PSE EMPRESA DE ENERGIA";
const NEQUI_IN = "TRANSFERENCIA DESDE NEQUI";

// Against the test database, as the application role, after real uploads;
// Resend and Clerk never.
const mocks = vi.hoisted(() => ({
  database: { current: undefined as unknown },
  sendEmail: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ getDb: () => mocks.database.current }));
vi.mock("@/lib/env", () => ({
  getServerEnv: () => ({ IDENTIFIER_HASH_KEY: HASH_KEY }),
}));
vi.mock("@/lib/email", () => ({ sendEmail: mocks.sendEmail }));
vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: async () => ({
    users: {
      getUser: async () => ({
        primaryEmailAddress: { emailAddress: "ana.prueba@correo.test" },
      }),
    },
  }),
}));

const AUGUST = { year: 2026, month: 8 };
const SEPTEMBER = { year: 2026, month: 9 };
const OCTOBER = { year: 2026, month: 10 };

const withBill = (pesos: number): readonly ExportRow[] => [[5, BILL, -pesos]];

describe.skipIf(!testDatabase)("what an upload's email says", () => {
  let app: DbClient;

  beforeAll(() => {
    vi.useFakeTimers({
      toFake: ["Date"],
      now: new Date("2026-11-09T15:00:00Z"),
    });
    app = createDb({ connectionString: requireTestDatabase().appUrl });
    mocks.database.current = app.db;
  });

  afterAll(async () => {
    vi.useRealTimers();
    await app.pool.end();
  });

  beforeEach(() => {
    mocks.sendEmail.mockReset();
    mocks.sendEmail.mockResolvedValue({ ok: true, value: undefined });
  });

  const newUser = () => findOrCreateUser(app.db, `test_${randomUUID()}`);

  const upload = (userId: UserId, content: ExtractedContent) =>
    uploadContent(app.db, userId, content);

  // Their earlier months, already told.
  const userWithHistory = async () => {
    const userId = await newUser();
    await upload(userId, monthExport(AUGUST, withBill(100_000)));
    await upload(userId, monthExport(SEPTEMBER, withBill(101_000)));
    await claimUploadNotice(userId);
    return userId;
  };

  const turnOff = (userId: UserId, ...notices: NoticeId[]) =>
    withUserContext(app.db, userId, async (ctx) => {
      for (const notice of notices)
        await saveNoticePreference(ctx, notice, false);
    });

  // What the upload's notice sends, and the email it wrote.
  const notify = async (userId: UserId) => {
    const claimed = await claimUploadNotice(userId);
    if (!claimed) throw new Error("Nothing claimed.");
    const outcome = await sendUploadNotice(userId, claimed);
    const [message] = mocks.sendEmail.mock.calls[0] ?? [];
    return { outcome, message };
  };

  const noticesIn = (url: string) =>
    readUnsubscribeToken(new URL(url).searchParams.get("token") ?? "", HASH_KEY)
      ?.notices;

  describe("a fixed payment that rose", () => {
    it("is told when the upload brought its highest month, with no name or amount", async () => {
      const userId = await userWithHistory();
      await upload(userId, monthExport(OCTOBER, withBill(130_000)));

      const { message } = await notify(userId);

      expect(message.subject).toBe("Tu archivo está listo");
      expect(message.text).toContain("Un pago fijo subió");
      expect(message.text).toContain("https://xtrakto.site/recurring?");
      for (const body of [message.text, message.html, message.subject])
        for (const secret of ["130.000", "130000", "EMPRESA", "ENERGIA"])
          expect(body).not.toContain(secret);
      expect(noticesIn(message.oneClickUrl)).toEqual([
        "uploadReady",
        "fixedPaymentRose",
      ]);
    });

    it("isn't told when it didn't rise", async () => {
      const userId = await userWithHistory();
      await upload(userId, monthExport(OCTOBER, withBill(100_500)));

      const { message } = await notify(userId);

      expect(message.text).not.toContain("pago fijo");
    });

    it("isn't told again by the same file", async () => {
      const userId = await userWithHistory();
      const october = monthExport(OCTOBER, withBill(130_000));
      await upload(userId, october);
      await claimUploadNotice(userId);
      await upload(userId, october);

      const { message } = await notify(userId);

      expect(message.text).not.toContain("pago fijo");
    });

    it("isn't told by a later file of its month that doesn't bring it", async () => {
      const userId = await userWithHistory();
      await upload(userId, monthExport(OCTOBER, withBill(130_000)));
      await claimUploadNotice(userId);
      await upload(
        userId,
        monthExport(OCTOBER, [[20, "COMPRA EN TIENDA", -5_000]]),
      );

      const { message } = await notify(userId);

      expect(message.text).not.toContain("pago fijo");
    });

    it("isn't told of a year long gone", async () => {
      const userId = await newUser();
      await upload(
        userId,
        monthExport({ year: 2024, month: 8 }, withBill(100_000)),
      );
      await upload(
        userId,
        monthExport({ year: 2024, month: 9 }, withBill(101_000)),
      );
      await upload(
        userId,
        monthExport({ year: 2024, month: 10 }, withBill(130_000)),
      );

      const { message } = await notify(userId);

      expect(message.text).not.toContain("pago fijo");
    });
  });

  describe("what waits for review", () => {
    const WITH_NEQUI: readonly ExportRow[] = [
      [8, NEQUI_IN, 50_000],
      [9, NEQUI_IN, 20_000],
    ];

    it("is told with its counts and the way to that quarter, with no text or amount", async () => {
      const userId = await newUser();
      await upload(userId, monthExport(OCTOBER, WITH_NEQUI));

      const { message } = await notify(userId);

      expect(message.text).toContain(
        "Tienes 1 grupo por revisar (2 movimientos)",
      );
      expect(message.text).toContain("https://xtrakto.site/review?");
      expect(message.text).toMatch(/period=2026-q4/);
      for (const body of [message.text, message.html])
        for (const secret of ["NEQUI", "50.000", "50000"])
          expect(body).not.toContain(secret);
    });

    it("isn't told when nothing waits", async () => {
      const userId = await newUser();
      await upload(userId, monthExport(OCTOBER, withBill(100_000)));

      const { message } = await notify(userId);

      expect(message.text).not.toContain("por revisar");
    });

    it("isn't told by the same file again", async () => {
      const userId = await newUser();
      const october = monthExport(OCTOBER, WITH_NEQUI);
      await upload(userId, october);
      await claimUploadNotice(userId);
      await upload(userId, october);

      const { message } = await notify(userId);

      expect(message.text).not.toContain("por revisar");
    });

    it("is of the upload's latest quarter where something waits", async () => {
      const userId = await newUser();
      await upload(userId, monthExport(AUGUST, WITH_NEQUI));
      await upload(userId, monthExport(OCTOBER, withBill(100_000)));

      const { message } = await notify(userId);

      expect(message.text).toMatch(/period=2026-q3/);
    });
  });

  describe("each notice's switch", () => {
    // Everything an upload can bring: its files, a review and a rise.
    const userWithEverything = async () => {
      const userId = await userWithHistory();
      await upload(
        userId,
        monthExport(OCTOBER, [...withBill(130_000), [8, NEQUI_IN, 50_000]]),
      );
      return userId;
    };

    it("says everything with every notice on", async () => {
      const { message } = await notify(await userWithEverything());

      expect(message.text).toContain("Leímos tu archivo");
      expect(message.text).toContain("por revisar");
      expect(message.text).toContain("Un pago fijo subió");
      expect(noticesIn(message.oneClickUrl)).toEqual([
        "uploadReady",
        "reviewWaiting",
        "fixedPaymentRose",
      ]);
    });

    it("leaves out the files with theirs off", async () => {
      const userId = await userWithEverything();
      await turnOff(userId, "uploadReady");

      const { message } = await notify(userId);

      expect(message.text).not.toContain("Leímos");
      expect(message.subject).toBe("Tienes 1 grupo por revisar (1 movimiento)");
      expect(noticesIn(message.oneClickUrl)).toEqual([
        "reviewWaiting",
        "fixedPaymentRose",
      ]);
    });

    it("leaves out the review with its off", async () => {
      const userId = await userWithEverything();
      await turnOff(userId, "reviewWaiting");

      const { message } = await notify(userId);

      expect(message.text).not.toContain("por revisar");
      expect(message.text).toContain("Un pago fijo subió");
    });

    it("leaves out the rise with its off", async () => {
      const userId = await userWithEverything();
      await turnOff(userId, "fixedPaymentRose");

      const { message } = await notify(userId);

      expect(message.text).toContain("por revisar");
      expect(message.text).not.toContain("pago fijo");
    });

    it("sends nothing with every notice off", async () => {
      const userId = await userWithEverything();
      await turnOff(userId, "uploadReady", "reviewWaiting", "fixedPaymentRose");

      const { outcome } = await notify(userId);

      expect(outcome).toEqual({ status: "not-sent", code: "NOTHING_TO_SAY" });
      expect(mocks.sendEmail).not.toHaveBeenCalled();
    });

    it("sends nothing with the files' off and nothing else to tell", async () => {
      const userId = await newUser();
      await upload(userId, monthExport(OCTOBER, withBill(100_000)));
      await turnOff(userId, "uploadReady");

      const { outcome } = await notify(userId);

      expect(outcome).toEqual({ status: "not-sent", code: "NOTHING_TO_SAY" });
    });

    it("turns off, from the email's link, every notice it carried and no other", async () => {
      // An upload with a rise and nothing to review carries two of the three.
      const userId = await userWithHistory();
      await upload(userId, monthExport(OCTOBER, withBill(130_000)));
      const { message } = await notify(userId);

      await turnNoticeOff(
        new URL(message.oneClickUrl).searchParams.get("token") ?? "",
      );

      await expect(
        withUserContext(app.db, userId, readNoticePreferences),
      ).resolves.toEqual({
        uploadReady: false,
        reviewWaiting: true,
        fixedPaymentRose: false,
        monthlySummary: false,
      });
    });
  });
});
