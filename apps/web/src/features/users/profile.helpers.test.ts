import { describe, expect, it } from "vitest";
import {
  initialOf,
  lastSignInInWords,
  ownRuleRows,
  signInMethodOf,
} from "./profile.helpers";

describe("initialOf", () => {
  it.each([
    ["Ana Lucía Martínez", "A"],
    ["  álvaro", "Á"],
    ["ana@example.com", "A"],
    ["", ""],
  ])("takes the avatar's letter from %j", (name, initial) => {
    expect(initialOf(name)).toBe(initial);
  });
});

describe("signInMethodOf", () => {
  it.each([
    [["oauth_google"], "google"],
    [["google"], "google"],
    [["oauth_github"], "email"],
    [[], "email"],
  ])("says %j signs in with %s", (providers, method) => {
    expect(signInMethodOf(providers)).toBe(method);
  });
});

describe("lastSignInInWords", () => {
  // 10:00 a. m. in Bogotá.
  const now = new Date("2026-10-28T15:00:00Z");

  it.each([
    ["2026-10-28T13:42:00Z", "hoy, 8:42 a.\u00a0m."],
    // 11:30 p. m. of the 27th in Bogotá, though the 28th in UTC.
    ["2026-10-28T04:30:00Z", "ayer, 11:30 p.\u00a0m."],
    ["2026-10-26T13:42:00Z", "26 de octubre, 8:42 a.\u00a0m."],
  ])("writes a sign-in at %s as %j", (signedInAt, words) => {
    expect(lastSignInInWords(new Date(signedInAt), now)).toBe(words);
  });

  it("counts days in Bogotá, where the evening is already tomorrow in UTC", () => {
    expect(
      lastSignInInWords(
        new Date("2026-10-28T23:00:00Z"),
        new Date("2026-10-29T03:00:00Z"),
      ),
    ).toBe("hoy, 6:00 p.\u00a0m.");
  });
});

describe("ownRuleRows", () => {
  // Invented rules, as the profile reads them.
  const rows = ownRuleRows([
    {
      id: "investment",
      rule: {
        target: "description",
        descriptionFolded: "PAGO LLAVE INVERSIONES XY",
        direction: "out",
        categoryId: "investment",
      },
    },
    {
      id: "card",
      rule: {
        target: "description",
        descriptionFolded: "PAGO PSE NU COMPANIA DE FINA",
        direction: "out",
        categoryId: "credit_card_payment",
      },
    },
    {
      id: "nequi",
      rule: {
        target: "reference",
        referenceHash: "a".repeat(64),
        referenceLast4: "1270",
        categoryId: "own_account_transfer",
      },
    },
  ]);

  it("lists the Nequi numbers first, then the texts by who they pay", () => {
    expect(rows.map(({ id }) => id)).toEqual(["nequi", "investment", "card"]);
  });

  it("names a number by its last 4 digits, as the user's", () => {
    expect(rows[0]).toEqual({
      id: "nequi",
      isNumber: true,
      categoryId: "own_account_transfer",
      title: "Nequi · ref ••• 1270",
      line: "Lo que envías a este número y lo que llega de él cuenta como movido.",
      isMine: "Es mío",
      notMine: "Ya no es mío: Nequi terminado en 1270",
    });
  });

  it("names a text by who it pays, over the text and what it counts as", () => {
    expect(rows[2]).toEqual({
      id: "card",
      isNumber: false,
      categoryId: "credit_card_payment",
      title: "NU COMPANIA DE FINA",
      line: "PAGO PSE NU COMPANIA DE FINA: pago de tarjeta de crédito, movido.",
      isMine: "Es mía",
      notMine: "Ya no es mía: NU COMPANIA DE FINA",
    });
  });
});
