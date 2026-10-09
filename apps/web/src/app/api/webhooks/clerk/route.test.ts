import { createHmac, randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

// Clerk's real signature check runs; only the deletion and the environment are
// replaced.
const mocks = vi.hoisted(() => ({
  deleteUserData: vi.fn(),
  signingSecret: undefined as string | undefined,
}));

vi.mock("@/features/users/user.service", () => ({
  deleteUserData: mocks.deleteUserData,
}));
vi.mock("@/lib/env", () => ({
  getServerEnv: () => ({ CLERK_WEBHOOK_SIGNING_SECRET: mocks.signingSecret }),
}));

const KEY = randomBytes(24);

// Standard Webhooks, as Clerk signs through Svix: the base64 HMAC-SHA-256 of
// "<id>.<timestamp>.<body>" with the secret's bytes.
const signedHeaders = (body: string, key: Buffer = KEY) => {
  const id = `msg_${randomBytes(8).toString("hex")}`;
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${body}`)
    .digest("base64");
  return {
    "svix-id": id,
    "svix-timestamp": timestamp,
    "svix-signature": `v1,${signature}`,
  };
};

const event = (type: string, id: string) =>
  JSON.stringify({ type, object: "event", data: { id, object: "user" } });

const post = (body: string, headers: Record<string, string> = {}) =>
  POST(
    new NextRequest("http://localhost/api/webhooks/clerk", {
      method: "POST",
      body,
      headers,
    }),
  );

beforeEach(() => {
  vi.resetAllMocks();
  mocks.signingSecret = `whsec_${KEY.toString("base64")}`;
});

describe("POST /api/webhooks/clerk", () => {
  it("deletes the data of a user deleted in Clerk", async () => {
    const body = event("user.deleted", "user_deleted");

    const response = await post(body, signedHeaders(body));

    expect(response.status).toBe(204);
    expect(mocks.deleteUserData).toHaveBeenCalledWith("user_deleted");
  });

  it("ignores other events", async () => {
    const body = event("user.created", "user_new");

    const response = await post(body, signedHeaders(body));

    expect(response.status).toBe(204);
    expect(mocks.deleteUserData).not.toHaveBeenCalled();
  });

  it.each([
    {
      case: "has no signature",
      headers: () => ({}),
    },
    {
      case: "was signed for another body",
      headers: () => signedHeaders(event("user.deleted", "someone_else")),
    },
    {
      case: "was signed with another secret",
      headers: (body: string) => signedHeaders(body, randomBytes(24)),
    },
  ])(
    "rejects a request that $case and deletes nothing",
    async ({ headers }) => {
      const body = event("user.deleted", "user_victim");

      const response = await post(body, headers(body));

      expect(response.status).toBe(400);
      expect(mocks.deleteUserData).not.toHaveBeenCalled();
    },
  );

  it("answers 503 while no signing secret is configured", async () => {
    mocks.signingSecret = undefined;
    const body = event("user.deleted", "user_deleted");

    const response = await post(body, signedHeaders(body));

    expect(response.status).toBe(503);
    expect(mocks.deleteUserData).not.toHaveBeenCalled();
  });
});
