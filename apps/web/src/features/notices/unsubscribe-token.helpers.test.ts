import { describe, expect, it } from "vitest";
import {
  readUnsubscribeToken,
  unsubscribeToken,
} from "./unsubscribe-token.helpers";

const SECRET = "test-key-with-at-least-32-characters!";
const ANA = {
  userId: "7d1e3c5a-2b4f-4e6a-8c9d-0e1f2a3b4c5d",
  notice: "uploadReady",
} as const;
const BRUNO_ID = "0b6f1d2e-58c4-4c31-9a59-6a3f0f5c2e11";

describe("an unsubscribe link's token", () => {
  it("reads back what it names", () => {
    expect(readUnsubscribeToken(unsubscribeToken(ANA, SECRET), SECRET)).toEqual(
      ANA,
    );
  });

  it("travels in a URL as it is", () => {
    expect(unsubscribeToken(ANA, SECRET)).toMatch(/^[\w.-]+$/);
  });

  it("refuses a signature moved to another person", () => {
    const [, notice, signature] = unsubscribeToken(ANA, SECRET).split(".");

    expect(
      readUnsubscribeToken(`${BRUNO_ID}.${notice}.${signature}`, SECRET),
    ).toBeNull();
  });

  it("refuses a signature moved to another notice", () => {
    const [userId, , signature] = unsubscribeToken(ANA, SECRET).split(".");

    expect(
      readUnsubscribeToken(`${userId}.monthlySummary.${signature}`, SECRET),
    ).toBeNull();
  });

  it("refuses one signed with another key", () => {
    expect(
      readUnsubscribeToken(
        unsubscribeToken(ANA, "another-key-with-at-least-32-characters"),
        SECRET,
      ),
    ).toBeNull();
  });

  it.each([
    "",
    "abc",
    "a.b",
    `${ANA.userId}.uploadReady.`,
    `${ANA.userId}.uploadReady.AAAA`,
    `${ANA.userId}.uploadReady.AAAA.extra`,
  ])("refuses the malformed token %j", (token) => {
    expect(readUnsubscribeToken(token, SECRET)).toBeNull();
  });
});
