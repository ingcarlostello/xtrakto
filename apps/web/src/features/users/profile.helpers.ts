import {
  addDaysTo,
  type CategoryId,
  DEFAULT_TIME_ZONE,
  formatDayInWords,
  formatTimeOfDay,
  localDateFromInstant,
  payeeLabelOf,
} from "@xtrakto/core";
import type { IdentifiedUserCategoryRule } from "@xtrakto/db";
import { categoryLabel } from "@/utils/category-label.helpers";
import { SESSION_COPY, YOURS_COPY } from "./user.constants";

export type SignInMethod = "google" | "email";

/** A rule of the user's that makes something theirs, as the profile lists it. */
export type OwnRuleRow = {
  readonly id: string;
  readonly isNumber: boolean;
  readonly categoryId: CategoryId;
  readonly title: string;
  readonly line: string;
  /** "Es mío" for a number, "Es mía" for a card, an investment or an account. */
  readonly isMine: string;
  /** What its "×" says to screen readers. */
  readonly notMine: string;
};

const lowerFirst = (text: string): string =>
  text.charAt(0).toLocaleLowerCase("es-CO") + text.slice(1);

// A Nequi number by its last 4 digits; a bank text by who it pays, as
// Pagos fijos names payees, over the text and what it counts as.
const ownRuleRow = ({ id, rule }: IdentifiedUserCategoryRule): OwnRuleRow => {
  if (rule.target === "reference") {
    const last4 = rule.referenceLast4 ?? "";
    return {
      id,
      isNumber: true,
      categoryId: rule.categoryId,
      title: `${YOURS_COPY.number} ${last4}`.trim(),
      line: YOURS_COPY.numberLine,
      isMine: YOURS_COPY.isMine.number,
      notMine: `${YOURS_COPY.notMine.number} ${last4}`.trim(),
    };
  }
  const text = rule.descriptionFolded;
  const title = payeeLabelOf(text) || text;
  return {
    id,
    isNumber: false,
    categoryId: rule.categoryId,
    title,
    line: `${text}: ${lowerFirst(categoryLabel(rule.categoryId))}, ${YOURS_COPY.moved}.`,
    isMine: YOURS_COPY.isMine.text,
    notMine: `${YOURS_COPY.notMine.text} ${title}`,
  };
};

/** "Lo que es tuyo": the Nequi numbers first, then the bank's texts, each by its title. */
export const ownRuleRows = (
  rules: readonly IdentifiedUserCategoryRule[],
): OwnRuleRow[] =>
  rules
    .map(ownRuleRow)
    .sort(
      (a, b) =>
        Number(b.isNumber) - Number(a.isNumber) ||
        a.title.localeCompare(b.title, "es"),
    );

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
