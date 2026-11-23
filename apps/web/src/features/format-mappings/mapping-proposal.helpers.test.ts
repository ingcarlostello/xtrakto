import { COLUMN_ROLE } from "@xtrakto/core";
import { describe, expect, it } from "vitest";
import {
  isRetryOf,
  proposalInput,
  proposalPromptFor,
  redactedSample,
  retryInput,
  retryPromptFor,
} from "./mapping-proposal.helpers";
import type { MappingFailure } from "./mapping-retry.schemas";

const { DATE, DESCRIPTION, AMOUNT, MONEY_OUT, MONEY_IN, BALANCE, NONE } =
  COLUMN_ROLE;

const SAMPLE = {
  header: ["FECHA TRANS", "DETALLE", "", "DEBITOS", "CREDITOS"],
  rows: [
    ["99/99/9999", "AAAAA AAAAAAAA", "", "", ""],
    ["99/99/9999", "AAAAAA AAA AAAAAA", "9999", "99.999,99", ""],
    ["99/99/9999", "AAAAA AAAAAA", "9999", "", "9.999.999,99"],
  ],
};

describe("proposalInput", () => {
  it("writes a line per column, with its name and its cells' shapes top to bottom", () => {
    expect(proposalInput(SAMPLE).split("\n")).toEqual([
      '1. FECHA TRANS: ["99/99/9999","99/99/9999","99/99/9999"]',
      '2. DETALLE: ["AAAAA AAAAAAAA","AAAAAA AAA AAAAAA","AAAAA AAAAAA"]',
      '3. (no name): ["","9999","9999"]',
      '4. DEBITOS: ["","99.999,99",""]',
      '5. CREDITOS: ["","","9.999.999,99"]',
    ]);
  });

  it("redacts the names once more", () => {
    const sample = {
      ...SAMPLE,
      header: SAMPLE.header.with(1, "CTA 123456789"),
    };

    expect(proposalInput(sample).split("\n")[1]).toMatch(
      /^2\. CTA \[NUMBER\]:/,
    );
  });
});

describe("redactedSample", () => {
  it("redacts the user's holder names from the header's names", () => {
    const sample = {
      ...SAMPLE,
      header: SAMPLE.header.with(1, "MOVIMIENTOS DE ANA MARIA PRUEBA GOMEZ"),
    };

    expect(redactedSample(sample, ["ANA MARIA PRUEBA GOMEZ"]).header[1]).toBe(
      "MOVIMIENTOS DE [NAME]",
    );
  });
});

describe("proposalPromptFor", () => {
  const { schema } = proposalPromptFor(5);

  it("takes a role for each column, read one way", () => {
    const roles = [DATE, DESCRIPTION, NONE, MONEY_OUT, MONEY_IN];

    expect(schema.safeParse({ roles })).toMatchObject({ success: true });
  });

  it.each([
    { what: "a role less", roles: [DATE, DESCRIPTION, MONEY_OUT, MONEY_IN] },
    {
      what: "a role more",
      roles: [DATE, DESCRIPTION, NONE, MONEY_OUT, MONEY_IN, BALANCE],
    },
    { what: "two dates", roles: [DATE, DATE, NONE, MONEY_OUT, MONEY_IN] },
    {
      what: "money read two ways",
      roles: [DATE, DESCRIPTION, AMOUNT, MONEY_OUT, MONEY_IN],
    },
    {
      what: "a role no table has",
      roles: [DATE, DESCRIPTION, "fee", MONEY_OUT, MONEY_IN],
    },
  ])("refuses $what, so the fallback model answers", ({ roles }) => {
    expect(schema.safeParse({ roles }).success).toBe(false);
  });

  it("is version 1 of the proposal prompt", () => {
    expect(proposalPromptFor(3)).toMatchObject({
      name: "propose-mapping",
      version: 1,
    });
  });
});

describe("retryPromptFor", () => {
  it("is version 1 of the second proposal's prompt, with a role for each column", () => {
    const prompt = retryPromptFor(5);
    const roles = [DATE, DESCRIPTION, NONE, MONEY_OUT, MONEY_IN];

    expect(prompt).toMatchObject({ name: "propose-mapping-retry", version: 1 });
    expect(prompt.instructions).toContain(proposalPromptFor(5).instructions);
    expect(prompt.schema.safeParse({ roles }).success).toBe(true);
    expect(prompt.schema.safeParse({ roles: roles.slice(1) }).success).toBe(
      false,
    );
  });
});

describe("retryInput", () => {
  const ROLES = [DATE, DESCRIPTION, NONE, MONEY_IN, MONEY_OUT];
  const linesFor = (failure: MappingFailure) =>
    retryInput(SAMPLE, { roles: ROLES, failure }).split("\n");

  it("writes the sample's columns, then the roles before and what failed", () => {
    expect(linesFor({ kind: "balances_break", percent: 40 })).toEqual([
      ...proposalInput(SAMPLE).split("\n"),
      "",
      "Your roles before: 1. date; 2. description; 3. none; 4. money_in; 5. money_out",
      "What failed: the balance doesn't follow the movements in 40% of the rows.",
    ]);
  });

  it.each<[MappingFailure, string]>([
    [
      { kind: "unread", column: 1, cause: "date" },
      "column 1's cells don't read as dates.",
    ],
    [
      { kind: "unread", column: 4, cause: "amount" },
      "column 4's cells don't read as amounts.",
    ],
    [
      { kind: "unread", column: 3, cause: "direction" },
      "column 3's words don't say which way the money went.",
    ],
    [
      { kind: "unread", column: 2, cause: "empty" },
      "column 2 is empty in a row with a movement.",
    ],
    [
      { kind: "unread", column: 5, cause: "both_amounts" },
      "a row has money in and money out at once.",
    ],
    [
      { kind: "unread", cause: "amount" },
      "a column's cells don't read as amounts.",
    ],
    [{ kind: "no_movements" }, "no row read as a movement."],
    [
      { kind: "balances_break", percent: 0 },
      "the movements don't add up to the closing balance.",
    ],
  ])("says what failed in words: %j", (failure, words) => {
    expect(linesFor(failure).at(-1)).toBe(`What failed: ${words}`);
  });
});

describe("isRetryOf", () => {
  const failure = { kind: "unread", column: 5, cause: "date" } as const;
  const roles = [DATE, DESCRIPTION, NONE, MONEY_OUT, MONEY_IN];

  it("takes a role for each of the sample's columns, and a failure in one of them", () => {
    expect(isRetryOf({ roles, failure }, SAMPLE)).toBe(true);
    expect(
      isRetryOf({ roles, failure: { kind: "no_movements" } }, SAMPLE),
    ).toBe(true);
  });

  it("refuses a role more or less, or a column the sample doesn't have", () => {
    expect(isRetryOf({ roles: roles.slice(1), failure }, SAMPLE)).toBe(false);
    expect(
      isRetryOf({ roles, failure: { ...failure, column: 6 } }, SAMPLE),
    ).toBe(false);
  });
});
