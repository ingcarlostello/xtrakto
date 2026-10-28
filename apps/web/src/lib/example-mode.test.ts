import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  EXAMPLE_CLERK_USER_ID,
  endExample,
  requireViewer,
  startExample,
} from "./example-mode";

// The browser's cookies, as next/headers reads and writes them.
const jar = vi.hoisted(() => new Map<string, string>());

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      jar.has(name) ? { name, value: jar.get(name) } : undefined,
    set: (name: string, value: string) => jar.set(name, value),
    delete: (name: string) => jar.delete(name),
  }),
}));
vi.mock("./auth", () => ({ requireSignedIn: async () => "user_signed_in" }));

beforeEach(() => {
  jar.clear();
});

describe("requireViewer", () => {
  it("shows the signed-in user's own data", async () => {
    expect(await requireViewer()).toEqual({
      clerkUserId: "user_signed_in",
      isExample: false,
    });
  });

  it("shows the example's while the browser explores it, until it ends", async () => {
    await startExample();
    expect(await requireViewer()).toEqual({
      clerkUserId: EXAMPLE_CLERK_USER_ID,
      isExample: true,
    });

    await endExample();
    expect((await requireViewer()).isExample).toBe(false);
  });

  it("never takes whose data from the cookie", async () => {
    jar.set("xtrakto-example", "user_someone_else");

    expect(await requireViewer()).toEqual({
      clerkUserId: "user_signed_in",
      isExample: false,
    });
  });
});
