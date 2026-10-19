import type {
  AmountMinor,
  AppError,
  CalendarQuarter,
  CategoryId,
  CategoryKind,
  LocalDate,
  Result,
  UserCategoryRule,
} from "@xtrakto/core";
import type {
  AccountRow,
  MovementDetail,
  TransactionListItem,
  UnreconciledStatement,
} from "@xtrakto/db";
import type { KindTotals } from "@/utils/kind-totals.helpers";
import type {
  MovementFilter,
  MovementPeriod,
  reviewHref,
} from "@/utils/transactions-url.helpers";
import type { CORRECTION_SCOPE, RULE_CHANGE } from "./transaction.constants";

/** A quarter to choose from, with what its movements say about it. */
export type QuarterChoice = CalendarQuarter & {
  readonly status: "verified" | "unverified" | "unreconciled";
};

/** What the URL asks the movements list for. */
export type TransactionsRequest = {
  readonly accountId?: string;
  readonly period?: MovementPeriod;
  /** What to look for among the period's movements, as typed. */
  readonly search?: string;
  /** Which of them to show: a kind, or those to review. */
  readonly filter?: MovementFilter;
  readonly shown: number;
  /** The movement whose detail opens beside the list. */
  readonly movementId?: string;
};

/** An account's movements in a period, as the list reads them. */
export type AccountTransactions = {
  /** The accounts with movements, the one with the latest first. */
  readonly accounts: readonly AccountRow[];
  readonly account: AccountRow;
  /** Its quarters to choose from, the latest first. */
  readonly quarters: readonly QuarterChoice[];
  /** Its statements that don't reconcile on the period's days. */
  readonly unreconciled: readonly UnreconciledStatement[];
  readonly period: MovementPeriod;
  /** What the list looks for, as typed. */
  readonly search?: string;
  readonly filter?: MovementFilter;
  /** The period's movements that count, by kind, whatever the list shows. */
  readonly kindTotals: KindTotals;
  /** How many of the period's movements wait for review. */
  readonly pendingReview: number;
  /** Every movement of the account in the period that counts and matches. */
  readonly total: number;
  /** The newest of them, as many as the list shows. */
  readonly items: readonly TransactionListItem[];
  /** The movement the URL details, when it's one of the account's that count. */
  readonly detail: OpenMovement | null;
  /** This year in Bogotá, which day headings leave out. */
  readonly currentYear: string;
};

/** A day of the list: its movements and, when printed, its closing balance. */
export type TransactionDay = {
  readonly date: LocalDate;
  readonly balanceMinor: AmountMinor | null;
  readonly items: readonly TransactionListItem[];
};

/** Why a row stands out: where a statement's balance breaks. */
export type MovementMark = {
  readonly note: string;
  /** The first one's id, for "Ir a la primera fila que no cuadra". */
  readonly anchor?: string;
};

/**
 * The tags under a movement: how its money moved, and its category or that
 * the category is only a guess waiting for review.
 */
export type MovementTags = {
  readonly channel: string | undefined;
  readonly category: string | undefined;
  readonly isPendingReview: boolean;
};

/** A movement's line: the bank's text as printed, or that it gave none. */
export type DescriptionView =
  | { readonly kind: "bank"; readonly text: string }
  | { readonly kind: "none"; readonly raw: string };

/** A link to the list with other filters. */
export type TransactionsHref = {
  readonly pathname: "/transactions";
  readonly query: Readonly<Record<string, string | number>>;
};

/** The list's next step: its link's label and where it goes. */
export type NextStep = {
  readonly label: string;
  readonly href: TransactionsHref;
};

/** Where each movement's detail opens, which one is open, and how it closes. */
export type DetailLinks = {
  readonly open: (movementId: string) => TransactionsHref;
  readonly close: TransactionsHref;
  readonly openId?: string;
};

type ReferenceRule = Extract<UserCategoryRule, { target: "reference" }>;
type DescriptionRule = Extract<UserCategoryRule, { target: "description" }>;

/** The user's rules that hold for a movement: its number's, and its text's. */
export type MovementRules = {
  readonly number: ReferenceRule | null;
  readonly text: DescriptionRule | null;
};

/** The movement the URL details, how many others a rule for its text would change, and the user's rules for it. */
export type OpenMovement = {
  readonly movement: MovementDetail;
  /** `null` for the bank's `0` or a movement of 0, which make no rule. */
  readonly similar: number | null;
  readonly rules: MovementRules;
};

export type RuleChange = (typeof RULE_CHANGE)[keyof typeof RULE_CHANGE];

/** A change from the detail's own block: a number made the user's, or a rule undone (6.3h). */
export type RuleChangeInput = {
  readonly account: string;
  readonly movement: string;
  readonly intent: RuleChange;
};

/** What the detail's own block shows after sending: nothing yet, or how it went. */
export type RuleChangeState = Result<RuleChange, AppError> | null;

/** A movement's Nequi number and the user's rule for its text, as the detail shows them. */
export type OwnRulesView = {
  readonly accountId: string;
  readonly movementId: string;
  /** Its Nequi number, whether the user said it's theirs; `null` without one. */
  readonly number: {
    readonly label: string;
    readonly state: "unknown" | "mine" | "theirs";
  } | null;
  /** What the user's rule for its text gives: "«Inversiones»". */
  readonly textRule: string | null;
};

export type CorrectionScope =
  (typeof CORRECTION_SCOPE)[keyof typeof CORRECTION_SCOPE];

/** A correction from the detail's form (6.3g). */
export type CorrectionInput = {
  readonly account: string;
  readonly movement: string;
  readonly category: CategoryId;
  readonly scope: CorrectionScope;
};

/** What a correction saved, which its form says back. */
export type CorrectionResult = Pick<CorrectionInput, "scope" | "category">;

/** What the detail's form shows after sending: nothing yet, or how it went. */
export type CorrectionState = Result<CorrectionResult, AppError> | null;

/** A movement's kind and category as choices (docs/ui/v8-03). */
export type CorrectionView = {
  readonly accountId: string;
  readonly movementId: string;
  /** The kinds its money's direction allows. */
  readonly kinds: readonly CategoryKind[];
  /** The one it counts as, or its direction's first. */
  readonly kind: CategoryKind;
  /** Its category, unless it has none of those kinds. */
  readonly categoryId: CategoryId | null;
  /** "Aplicar a los 3 parecidos"; `null` when its text makes no rule. */
  readonly applyLabel: string | null;
};

/** A line of a movement's detail: "Canal" and "PSE". */
export type DetailFact = { readonly label: string; readonly value: string };

/** A movement as its detail shows it (docs/ui/v8-03). */
export type MovementDetailView = {
  readonly id: string;
  /** The bank's text, or that it gave none. */
  readonly title: string;
  /** Its text exactly as printed, for "Así lo escribe el banco". */
  readonly bankText: string;
  /** `"Domingo 27 de septiembre de 2026"`. */
  readonly date: string;
  /** `"−$182.000"`. */
  readonly amount: string;
  readonly tone: MovementTone;
  readonly categoryId: CategoryId | null;
  /** Its channel, reference, source and balance after, those it has. */
  readonly facts: readonly DetailFact[];
  /** The category is a best guess waiting for the quick review. */
  readonly isGuess: boolean;
  /** What follows "Por qué:": the rule's reason, or the user's answer. */
  readonly reason: string;
  /** Where its guess is answered, while it waits. */
  readonly reviewHref?: ReturnType<typeof reviewHref>;
};

/** An option of the period selector or the account switch. */
export type PeriodOption = {
  readonly key: string;
  readonly label: string;
  readonly href: TransactionsHref;
  readonly isCurrent: boolean;
  /** A quarter's status: "Verificado" or "Sin verificar". */
  readonly badge?: {
    readonly label: string;
    readonly variant: "ok" | "neutral" | "attention";
  };
};

/**
 * The colors a movement shows: its kind's, or neutral while it waits for
 * review, has no category or counts nowhere.
 */
export type MovementTone = "income" | "spending" | "moved" | "neutral";

/** A kind's tile on Movimientos (docs/ui/v8-03). */
export type KindTile = {
  readonly tone: Exclude<MovementTone, "neutral">;
  readonly label: string;
  /** `["+$46,8M"]`, or both ways for money that moved: `["−$29,8M", "+$2,8M"]`. */
  readonly totals: readonly string[];
  /** `"41 movimientos"`, or `"57 salieron · 8 volvieron"`. */
  readonly detail: string;
};

/** A filter chip: what it shows and its link; the current one is marked. */
export type FilterOption = {
  readonly label: string;
  readonly href: TransactionsHref;
  readonly isCurrent: boolean;
};
