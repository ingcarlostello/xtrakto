import type { AppError, Result } from "@xtrakto/core";
import type { AccountRow, IdentifiedUserCategoryRule } from "@xtrakto/db";
import type { SignInMethod } from "./profile.helpers";

/** Who is signed in, as "Tu cuenta en Xtrakto" and "Sesión" show it (7.7b). */
export type ProfileAccount = {
  /** `null` when Clerk has no name for the user. */
  readonly name: string | null;
  readonly email: string | null;
  readonly signsInWith: SignInMethod;
  /** When they last signed in, in words ("hoy, 8:42 a. m."), if Clerk knows. */
  readonly lastSignIn: string | null;
};

/** "Cómo te escribe el banco" and "Tus cuentas y lo que es tuyo" (7.7c). */
export type YourAccounts = {
  readonly holderNames: readonly string[];
  readonly ownNameTexts: readonly string[];
  readonly accounts: readonly AccountRow[];
  readonly ownRules: readonly IdentifiedUserCategoryRule[];
};

/** What the profile's "×" answers: nothing yet, or whether the rule went. */
export type RemoveOwnRuleState = Result<void, AppError> | null;
