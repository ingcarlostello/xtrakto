import { describe, expect, it } from "vitest";
import { ruleChangeSchema } from "./own-rules.schemas";

const ACCOUNT = "3f1c6a52-6d3b-4c4e-9a53-1d2f0b7e8a90";
const MOVEMENT = "8b2d4f60-1a2b-4c3d-8e9f-0a1b2c3d4e5f";

describe("ruleChangeSchema", () => {
  it.each(["mine", "undo_number", "undo_text"])("reads %s", (intent) => {
    expect(
      ruleChangeSchema.parse({ account: ACCOUNT, movement: MOVEMENT, intent }),
    ).toEqual({ account: ACCOUNT, movement: MOVEMENT, intent });
  });

  it.each([
    ["another intent", { intent: "delete_everything" }],
    ["a movement that isn't an id", { movement: "3001234567" }],
    ["no account", { account: undefined }],
  ])("refuses %s", (_, change) => {
    expect(
      ruleChangeSchema.safeParse({
        account: ACCOUNT,
        movement: MOVEMENT,
        intent: "mine",
        ...change,
      }).success,
    ).toBe(false);
  });
});
