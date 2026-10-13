import { APP_ERROR_CODE, err, ok } from "@xtrakto/core";
import { describe, expect, it } from "vitest";
import { pinAccount } from "./account-pin.helpers";
import type { UploadAccount } from "./upload.types";

const QUARTERLY = {
  bankId: "bancolombia",
  accountType: "savings",
  identifiesAccount: true,
} as const;
const EXPORT = { ...QUARTERLY, identifiesAccount: false } as const;

const account = (id: string, last4: string | null = null): UploadAccount => ({
  id,
  bankId: "bancolombia",
  accountType: "savings",
  last4,
});
const CARD: UploadAccount = { ...account("card"), accountType: "credit_card" };

describe("pinAccount", () => {
  it("leaves a quarterly statement unpinned: it names its own account", () => {
    expect(pinAccount(QUARTERLY, undefined, [account("a", "8901")])).toEqual(
      ok({}),
    );
  });

  it("refuses an account chosen for a quarterly statement", () => {
    expect(pinAccount(QUARTERLY, { accountId: "a" }, [account("a")])).toEqual(
      err({
        code: APP_ERROR_CODE.INVALID_INPUT,
        details: { reason: "account" },
      }),
    );
  });

  it("pins an export to the chosen account", () => {
    const accounts = [account("a", "8901"), account("b", "2109")];

    expect(pinAccount(EXPORT, { accountId: "b" }, accounts)).toEqual(
      ok({ accountId: "b" }),
    );
  });

  it.each([
    ["isn't the user's", "b", [account("a")]],
    ["is of another type", "card", [account("a"), CARD]],
  ])("refuses a chosen account that %s", (_case, accountId, accounts) => {
    expect(pinAccount(EXPORT, { accountId }, accounts)).toEqual(
      err({ code: APP_ERROR_CODE.NOT_FOUND }),
    );
  });

  it("pins an export to the digits of an account a quarterly statement will create", () => {
    expect(
      pinAccount(EXPORT, { accountLast4: "2109" }, [account("a")]),
    ).toEqual(ok({ accountLast4: "2109" }));
  });

  it("pins an export without a choice to the user's only account of its kind", () => {
    expect(pinAccount(EXPORT, undefined, [account("a", "8901"), CARD])).toEqual(
      ok({ accountId: "a" }),
    );
  });

  it("leaves an export unpinned when the user has no account yet", () => {
    expect(pinAccount(EXPORT, undefined, [])).toEqual(ok({}));
  });

  it("asks for a choice when the user has several accounts of its kind", () => {
    expect(
      pinAccount(EXPORT, undefined, [account("a", "8901"), account("b")]),
    ).toEqual(err({ code: APP_ERROR_CODE.ACCOUNT_REQUIRED }));
  });
});
