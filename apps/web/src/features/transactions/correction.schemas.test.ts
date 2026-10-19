import { describe, expect, it } from "vitest";
import { correctionSchema } from "./correction.schemas";

const ACCOUNT = "3f1c6a52-6d3b-4c4e-9a53-1d2f0b7e8a90";
const MOVEMENT = "8b2d4f60-1a2b-4c3d-8e9f-0a1b2c3d4e5f";

const CORRECTION = {
  account: ACCOUNT,
  movement: MOVEMENT,
  category: "investment",
  scope: "similar",
  kind: "internal",
};

describe("correctionSchema", () => {
  it("reads the movement, its category and the scope, leaving the kind out", () => {
    expect(correctionSchema.parse(CORRECTION)).toEqual({
      account: ACCOUNT,
      movement: MOVEMENT,
      category: "investment",
      scope: "similar",
    });
  });

  it.each([
    ["a category the table doesn't have", { category: "digital_wallet" }],
    ["another scope", { scope: "everything" }],
    ["a movement that isn't an id", { movement: "3001234567" }],
    ["no account", { account: undefined }],
  ])("refuses %s", (_, change) => {
    expect(
      correctionSchema.safeParse({ ...CORRECTION, ...change }).success,
    ).toBe(false);
  });
});
