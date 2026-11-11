import { COLUMN_ROLE } from "@xtrakto/core";
import { describe, expect, it } from "vitest";
import {
  proposalInput,
  proposalPromptFor,
  redactedSample,
} from "./mapping-proposal.helpers";

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
