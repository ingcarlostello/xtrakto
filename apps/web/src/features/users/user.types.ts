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
