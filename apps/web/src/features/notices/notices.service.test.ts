import { randomUUID } from "node:crypto";
import {
  createDb,
  type DbClient,
  findOrCreateUser,
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
  claimUploadNotice,
  getNoticePreferences,
  sendUploadNotice,
  setNoticePreference,
  turnNoticeOff,
} from "./notices.service";
import { unsubscribeToken } from "./unsubscribe-token.helpers";

const HASH_KEY = "test-key-with-at-least-32-characters!";
const ADDRESS = "ana.prueba@correo.test";
const NOTICE = {
  jobId: "7d1e3c5a-2b4f-4e6a-8c9d-0e1f2a3b4c5d",
  files: 2,
  failed: 1,
  added: 7,
};

// Against the test database, as the application role; Resend and Clerk never.
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
  clerkClient: async () => ({ users: { getUser: mocks.getUser } }),
}));

describe.skipIf(!testDatabase)("notices", () => {
  let app: DbClient;
  const clerkId = () => `user_notice_${randomUUID()}`;
  const newUser = () => findOrCreateUser(app.db, clerkId());
  const isOn = async (userId: UserId) =>
    (await withUserContext(app.db, userId, readNoticePreferences)).uploadReady;

  beforeAll(() => {
    app = createDb({
      connectionString: requireTestDatabase().appUrl,
      maxConnections: 2,
    });
    mocks.database.current = app.db;
  });

  afterAll(async () => {
    await app.pool.end();
  });

  beforeEach(() => {
    mocks.sendEmail.mockReset();
    mocks.getUser.mockReset();
    mocks.sendEmail.mockResolvedValue({ ok: true, value: undefined });
    mocks.getUser.mockResolvedValue({
      primaryEmailAddress: { emailAddress: ADDRESS },
    });
  });

  describe("the profile's switch", () => {
    it("reads the defaults without creating the user", async () => {
      await expect(getNoticePreferences(clerkId())).resolves.toEqual({
        uploadReady: true,
      });
    });

    it("saves only the session's user's notice", async () => {
      const ana = clerkId();
      const bruno = await newUser();

      await setNoticePreference(ana, "uploadReady", false);

      await expect(getNoticePreferences(ana)).resolves.toEqual({
        uploadReady: false,
      });
      expect(await isOn(bruno)).toBe(true);
    });
  });

  describe("an unsubscribe link", () => {
    const tokenOf = (userId: string, secret = HASH_KEY) =>
      unsubscribeToken({ userId, notice: "uploadReady" }, secret);

    it("turns off only its notice, for only its person", async () => {
      const [ana, bruno] = [await newUser(), await newUser()];

      await turnNoticeOff(tokenOf(ana));

      expect(await isOn(ana)).toBe(false);
      expect(await isOn(bruno)).toBe(true);
    });

    it("changes nothing when forged", async () => {
      const ana = await newUser();

      await turnNoticeOff(
        tokenOf(ana, "another-key-with-at-least-32-characters"),
      );
      await turnNoticeOff("nothing-like-a-token");

      expect(await isOn(ana)).toBe(true);
    });

    it("does nothing for someone already gone", async () => {
      await expect(
        turnNoticeOff(tokenOf(randomUUID())),
      ).resolves.toBeUndefined();
    });

    it("can be followed twice", async () => {
      const ana = await newUser();

      await turnNoticeOff(tokenOf(ana));
      await turnNoticeOff(tokenOf(ana));

      expect(await isOn(ana)).toBe(false);
    });
  });

  describe("claiming an upload's notice", () => {
    it("has nothing to say without ended files", async () => {
      await expect(claimUploadNotice(await newUser())).resolves.toBeNull();
    });

    it("stays quiet when the person turned it off", async () => {
      const userId = await newUser();
      await withUserContext(app.db, userId, (ctx) =>
        saveNoticePreference(ctx, "uploadReady", false),
      );

      await expect(claimUploadNotice(userId)).resolves.toBeNull();
    });
  });

  describe("sending an upload's notice", () => {
    it("emails the person's address once, with counts and its own links", async () => {
      const userId = await newUser();

      await expect(sendUploadNotice(userId, NOTICE)).resolves.toEqual({
        status: "sent",
      });

      expect(mocks.sendEmail).toHaveBeenCalledOnce();
      const [message] = mocks.sendEmail.mock.calls[0] ?? [];
      expect(message).toMatchObject({
        to: ADDRESS,
        subject: "Tus archivos están listos",
        idempotencyKey: `upload-notice/${NOTICE.jobId}`,
      });
      expect(message.oneClickUrl).toContain(
        `https://xtrakto.site/api/unsubscribe?token=${userId}.uploadReady.`,
      );
      expect(message.text).toContain(
        `https://xtrakto.site/unsubscribe?token=${userId}.uploadReady.`,
      );
    });

    it("never returns the address", async () => {
      const outcome = await sendUploadNotice(await newUser(), NOTICE);

      expect(JSON.stringify(outcome)).not.toContain(ADDRESS);
    });

    it("sends nothing to someone without an address", async () => {
      mocks.getUser.mockResolvedValue({ primaryEmailAddress: null });

      await expect(sendUploadNotice(await newUser(), NOTICE)).resolves.toEqual({
        status: "not-sent",
        code: "NO_ADDRESS",
      });
      expect(mocks.sendEmail).not.toHaveBeenCalled();
    });

    it.each([
      [{ code: "EMAIL_OFF" }, "EMAIL_OFF"],
      [{ code: "EMAIL_UNDELIVERABLE" }, "EMAIL_UNDELIVERABLE"],
      [
        {
          code: "EMAIL_FAILED",
          reason: "validation_error",
          isTransient: false,
        },
        "validation_error",
      ],
    ])("ends with a code when %j", async (error, code) => {
      mocks.sendEmail.mockResolvedValue({ ok: false, error });

      await expect(sendUploadNotice(await newUser(), NOTICE)).resolves.toEqual({
        status: "not-sent",
        code,
      });
    });

    it("throws what may pass, for Inngest to retry, naming no address", async () => {
      mocks.sendEmail.mockResolvedValue({
        ok: false,
        error: {
          code: "EMAIL_FAILED",
          reason: "rate_limit_exceeded",
          isTransient: true,
        },
      });

      const failure = await sendUploadNotice(await newUser(), NOTICE).catch(
        (error: unknown) => String(error),
      );

      expect(failure).toContain("UPLOAD_NOTICE_NOT_SENT");
      expect(failure).not.toContain(ADDRESS);
    });
  });
});
