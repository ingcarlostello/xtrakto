import { describe, expect, it } from "vitest";
import { isPublicPath, isWaitlistPath } from "./auth-routes";

describe("isWaitlistPath", () => {
  it.each(["/waitlist", "/waitlist/joined"])(
    "serves %s in a waitlist-only deployment",
    (path) => {
      expect(isWaitlistPath(path)).toBe(true);
    },
  );

  it.each([
    "/",
    "/upload",
    "/sign-in",
    "/api/inngest",
    "/api/webhooks/clerk",
    "/waitlistx",
    "/waitlist-admin",
  ])("sends %s to the waitlist in a waitlist-only deployment", (path) => {
    expect(isWaitlistPath(path)).toBe(false);
  });
});

describe("isPublicPath", () => {
  it.each([
    "/sign-in",
    "/sign-in/factor-one",
    "/sign-in/sso-callback",
    "/sign-up",
    "/sign-up/verify-email-address",
    "/api/webhooks/clerk",
    "/api/inngest",
    "/waitlist",
    "/waitlist/joined",
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
    "/waitlistx",
    "/waitlist-admin",
  ])("asks for a session on %s", (path) => {
    expect(isPublicPath(path)).toBe(false);
  });
});
