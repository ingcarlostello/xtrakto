import {
  type AmountMinor,
  type CategoryId,
  type CategoryKind,
  categoryKind,
  channelOf,
  type LocalDate,
} from "@xtrakto/core";
import type { ExportMovement } from "@xtrakto/db";
import { accountLabel } from "./account-label.helpers";
import { categoryLabel } from "./category-label.helpers";

/** A CSV file ready to download: its name and its text. */
export type CsvFile = {
  readonly fileName: string;
  readonly content: string;
};

// For Excel in Spanish (7.6, decided with the human): semicolons, a decimal
// comma and Windows line ends, as Bancolombia's own CSV.
const SEPARATOR = ";";
const LINE_END = "\r\n";

/**
 * Starts the file the browser saves, so that Excel reads the accents as
 * UTF-8. Added there, not to the text: React's transport of a server
 * action's long string drops a leading one.
 */
export const CSV_BYTE_ORDER_MARK = "﻿";

const HEADERS = [
  "Fecha",
  "Cuenta",
  "Texto del banco",
  "Valor",
  "Saldo después",
  "Tipo",
  "Categoría",
  "Por revisar",
  "Canal",
  "Referencia",
] as const;
const COUNTS_HEADER = "Cuenta en tu resumen";

const KIND_LABELS: Readonly<Record<CategoryKind, string>> = {
  income: "Ingreso",
  spending: "Gasto real",
  internal: "Movido",
};

const yesOrNo = (value: boolean): string => (value ? "Sí" : "No");

// Money in no rule knows has no category, and so no kind.
const kindCell = (categoryId: CategoryId | null): string => {
  const kind = categoryId === null ? undefined : categoryKind(categoryId);
  return kind === undefined ? "" : KIND_LABELS[kind];
};

/** `dd/mm/aaaa`, as Excel in Spanish reads a date. */
const dateCell = (date: LocalDate): string => {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
};

/** Pesos with a decimal comma and no thousands separator: `-150000,00`. */
export const amountCell = (amount: AmountMinor | null): string => {
  if (amount === null) return "";
  const cents = Math.abs(amount);
  const pesos = Math.trunc(cents / 100);
  const sign = amount < 0 ? "-" : "";
  return `${sign}${pesos},${String(cents % 100).padStart(2, "0")}`;
};

// A text cell Excel would read as a formula (a bank's text can start with
// any character) starts with an apostrophe instead; one with a separator,
// quotes or a line end goes between quotes.
const FORMULA_START = /^[=+\-@\t\r]/;
const NEEDS_QUOTES = /[;"\r\n]/;

/** A text cell, safe to open in a spreadsheet. */
export const textCell = (text: string): string => {
  const safe = FORMULA_START.test(text) ? `'${text}` : text;
  return NEEDS_QUOTES.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
};

const rowOf = (movement: ExportMovement): string[] => {
  const { categoryId, descriptionRaw } = movement;
  return [
    dateCell(movement.date),
    textCell(accountLabel(movement, movement.accountLast4)),
    textCell(descriptionRaw),
    amountCell(movement.amountMinor),
    amountCell(movement.balanceAfterMinor),
    kindCell(categoryId),
    categoryId === null ? "" : textCell(categoryLabel(categoryId)),
    yesOrNo(movement.isPendingReview),
    textCell(channelOf(descriptionRaw)?.labelEs ?? ""),
    movement.referenceLast4 ?? "",
  ];
};

type CsvOptions = {
  /** Every movement's export says which count in the summary. */
  readonly withCounts: boolean;
};

/**
 * Movements as a CSV for Excel in Spanish: one row each, as the bank
 * printed its text, with its kind, category and channel in words. Never a
 * reference beyond its last 4 digits.
 */
export const movementsCsv = (
  movements: readonly ExportMovement[],
  { withCounts }: CsvOptions,
): string => {
  const header = withCounts ? [...HEADERS, COUNTS_HEADER] : [...HEADERS];
  const rows = movements.map((movement) =>
    withCounts
      ? [...rowOf(movement), yesOrNo(movement.counts)]
      : rowOf(movement),
  );
  const lines = [header, ...rows].map((cells) => cells.join(SEPARATOR));
  return `${lines.join(LINE_END)}${LINE_END}`;
};
