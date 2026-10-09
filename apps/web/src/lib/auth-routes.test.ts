import { describe, expect, it } from "vitest";
import { isPublicPath } from "./auth-routes";

describe("isPublicPath", () => {
  it.each([
    "/sign-in",
    "/sign-in/factor-one",
    "/sign-in/sso-callback",
    "/sign-up",
    "/sign-up/verify-email-address",
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
  ])("asks for a session on %s", (path) => {
    expect(isPublicPath(path)).toBe(false);
  });
});
