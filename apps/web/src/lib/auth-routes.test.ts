import { describe, expect, it } from "vitest";
import { isPublicPath } from "./auth-routes";

describe("isPublicPath", () => {
  it.each([
    "/sign-in",
    "/sign-in/factor-one",
    "/sign-in/sso-callback",
    "/sign-up",
    "/sign-up/verify-email-address",
    "/api/webhooks/clerk",
    "/api/inngest",
  ])("lets a signed-out visitor open %s", (path) => {
    expect(isPublicPath(path)).toBe(true);
  });

  it.each([
    "/",
    "/settings",
    "/transactions",
    "/design-system",
    "/sign-inx",
    "/sign-up-later",
    "/api/anything",
    "/api/webhooks",
    "/api/webhooks/clerkx",
    "/api/inngestx",
  ])("asks for a session on %s", (path) => {
    expect(isPublicPath(path)).toBe(false);
  });
});
