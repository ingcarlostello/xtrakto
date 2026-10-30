import {
  amountMinorSchema,
  localDateSchema,
  periodSchema,
  type UserCategoryRule,
} from "@xtrakto/core";
import type { MovementDetail } from "@xtrakto/db";
import { describe, expect, it } from "vitest";
import {
  myNumberRule,
  ownRulesView,
  ruleChangedText,
  rulesOfMovement,
} from "./own-rules.helpers";

// A send to a Nequi number from an export, as its detail reads it.
const send = (changes: Partial<MovementDetail> = {}): MovementDetail => ({
  id: "m1",
  date: localDateSchema.parse("2026-10-03"),
  descriptionRaw: "TRANSFERENCIAS A NEQUI",
  descriptionNormalized: "TRANSFERENCIAS A NEQUI",
  amountMinor: amountMinorSchema.parse(-9_000_000),
  balanceAfterMinor: null,
  categoryId: "transfers_to_people",
  isPendingReview: true,
  referenceHash: "h1",
  referenceKind: "phone",
  referenceLast4: "1270",
  categorySource: "rule",
  categoryRuleId: "nequi_out_number",
  llmTitle: null,
  statement: {
    formatId: "bancolombia-movements-export",
    period: periodSchema.parse({ from: "2026-10-01", to: "2026-10-07" }),
  },
  ...changes,
});

const MINE: UserCategoryRule = {
  target: "reference",
  referenceHash: "h1",
  referenceLast4: "1270",
  categoryId: "own_account_transfer",
};
const THEIRS: UserCategoryRule = { ...MINE, categoryId: "transfers_to_people" };
const SENDS: UserCategoryRule = {
  target: "description",
  descriptionFolded: "TRANSFERENCIAS A NEQUI",
  direction: "out",
  categoryId: "investment",
};

describe("rulesOfMovement", () => {
  it("finds the user's rule for its number and for its text going its way", () => {
    const others: UserCategoryRule[] = [
      { ...MINE, referenceHash: "h2" },
      { ...SENDS, direction: "in" },
      { ...SENDS, descriptionFolded: "TRANSFERENCIA DESDE NEQUI" },
    ];

    expect(rulesOfMovement(send(), [...others, MINE, SENDS])).toEqual({
      number: MINE,
      text: SENDS,
    });
    expect(rulesOfMovement(send(), others)).toEqual({
      number: null,
      text: null,
    });
  });

  it("finds no rule for the text of the bank's 0", () => {
    expect(
      rulesOfMovement(
        send({ descriptionNormalized: "0", referenceHash: null }),
        [{ ...SENDS, descriptionFolded: "0" }],
      ),
    ).toEqual({ number: null, text: null });
  });
});

describe("myNumberRule", () => {
  it("makes a Nequi number the user's, both ways", () => {
    expect(myNumberRule(send())).toEqual(MINE);
  });

  it.each([
    ["a code", { referenceKind: "code" as const }],
    ["no number", { referenceKind: "none" as const, referenceHash: null }],
  ])("makes nothing of %s", (_, changes) => {
    expect(myNumberRule(send(changes))).toBeNull();
  });
});

describe("ownRulesView", () => {
  const view = (rules: Parameters<typeof ownRulesView>[0]["rules"]) =>
    ownRulesView({ movement: send(), similar: 0, rules }, "a1");

  it.each([
    [null, "unknown"],
    [MINE, "mine"],
    [THEIRS, "theirs"],
  ] as const)(
    "names its Nequi number and what the user said: %j",
    (number, state) => {
      expect(view({ number, text: null })).toEqual({
        accountId: "a1",
        movementId: "m1",
        number: { label: "Nequi ••• 1270", state },
        textRule: null,
      });
    },
  );

  it("says what the user's rule for its text gives", () => {
    expect(view({ number: null, text: SENDS }).textRule).toBe("«Inversiones»");
  });

  it("shows no number for a movement without a Nequi number", () => {
    expect(
      ownRulesView(
        {
          movement: send({ referenceKind: "code" }),
          similar: 0,
          rules: { number: null, text: null },
        },
        "a1",
      ).number,
    ).toBeNull();
  });
});

describe("ruleChangedText", () => {
  it.each([
    ["mine", "Listo: ese Nequi es tuyo."],
    ["undo_number", "Listo: deshicimos tu respuesta para ese Nequi."],
    ["undo_text", "Listo: deshicimos tu regla para este texto."],
  ] as const)("says what %s did", (change, text) => {
    expect(ruleChangedText(change)).toBe(text);
  });
});
