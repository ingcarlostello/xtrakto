import {
  addDaysTo,
  DEFAULT_TIME_ZONE,
  formatDayInWords,
  formatTimeOfDay,
  localDateFromInstant,
} from "@xtrakto/core";
import { SESSION_COPY } from "./user.constants";

export type SignInMethod = "google" | "email";

/** The letter of the account's avatar: the first of its name or email. */
export const initialOf = (name: string): string =>
  (Array.from(name.trim())[0] ?? "").toLocaleUpperCase("es-CO");

/**
 * How the user signs in, from the providers of their external accounts,
 * which Clerk names `oauth_google` or `google`; without one, by email.
 */
export const signInMethodOf = (providers: readonly string[]): SignInMethod =>
  providers.some((provider) => provider.replace(/^oauth_/, "") === "google")
    ? "google"
    : "email";

/**
 * When the user last signed in, in Bogotá: `"hoy, 8:42 a. m."`, `"ayer,
 * 6:05 p. m."` or `"27 de octubre, 8:42 a. m."`.
 */
export const lastSignInInWords = (signedInAt: Date, now: Date): string => {
  const day = localDateFromInstant(signedInAt, DEFAULT_TIME_ZONE);
  const today = localDateFromInstant(now, DEFAULT_TIME_ZONE);
  const dayWords =
    day === today
      ? SESSION_COPY.today
      : day === addDaysTo(today, -1)
        ? SESSION_COPY.yesterday
        : formatDayInWords(day);
  return `${dayWords}, ${formatTimeOfDay(signedInAt, DEFAULT_TIME_ZONE)}`;
};
