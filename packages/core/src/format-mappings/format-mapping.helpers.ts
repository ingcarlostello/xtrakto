import { sha256Hex } from "../hashing/web-crypto.utils";
import { foldText } from "../text/text.utils";
import { COLUMN_ROLE } from "./format-mapping.constants";
import type { ColumnRole } from "./format-mapping.types";

/**
 * A format's fingerprint, by which its mapping is saved and found: the
 * SHA-256 of its header's names, as `headerNames` in `@xtrakto/parsers`
 * writes them, so a key of fixed length stands for a header of any size.
 */
export const formatFingerprint = (header: readonly string[]): Promise<string> =>
  sha256Hex(JSON.stringify(header));

/** What a mapping says of its columns, before they are checked. */
type MappingColumns = {
  readonly header: readonly string[];
  readonly columns: readonly ColumnRole[];
  readonly directionWords?: {
    readonly in: readonly string[];
    readonly out: readonly string[];
  };
};

const {
  DATE,
  DESCRIPTION,
  AMOUNT,
  MONEY_OUT,
  MONEY_IN,
  BALANCE,
  REFERENCE,
  DIRECTION,
} = COLUMN_ROLE;

const MONEY_ROLES = [AMOUNT, MONEY_OUT, MONEY_IN, DIRECTION] as const;

type MoneyWay = Readonly<Record<(typeof MONEY_ROLES)[number], number>>;

// The ways a table writes its money, by how many columns of each role it
// takes: one signed amount; money out and money in, each in its own column;
// or an amount and which way it went.
const MONEY_WAYS: readonly MoneyWay[] = [
  { [AMOUNT]: 1, [MONEY_OUT]: 0, [MONEY_IN]: 0, [DIRECTION]: 0 },
  { [AMOUNT]: 0, [MONEY_OUT]: 1, [MONEY_IN]: 1, [DIRECTION]: 0 },
  { [AMOUNT]: 1, [MONEY_OUT]: 0, [MONEY_IN]: 0, [DIRECTION]: 1 },
];

const countOf = (columns: readonly ColumnRole[], role: ColumnRole): number =>
  columns.filter((column) => column === role).length;

const readsMoneyOneWay = (columns: readonly ColumnRole[]): boolean =>
  MONEY_WAYS.some((way) =>
    MONEY_ROLES.every((role) => countOf(columns, role) === way[role]),
  );

/**
 * Why a table's roles can't read its movements, whatever its header, or
 * undefined when they can: one date and one description, at most one
 * balance and one reference, and money read one way.
 */
export const columnRolesProblem = (
  columns: readonly ColumnRole[],
): string | undefined => {
  if (countOf(columns, DATE) !== 1) return "one date column";
  if (countOf(columns, DESCRIPTION) !== 1) return "one description column";
  if (countOf(columns, BALANCE) > 1) return "one balance column at most";
  if (countOf(columns, REFERENCE) > 1) return "one reference column at most";
  return readsMoneyOneWay(columns) ? undefined : "money read one way";
};

const wordsProblem = ({
  columns,
  directionWords,
}: MappingColumns): string | undefined => {
  if (columns.includes(DIRECTION) !== (directionWords !== undefined)) {
    return "direction words exactly with a direction column";
  }
  const out = new Set(directionWords?.out.map(foldText));
  return directionWords?.in.some((word) => out.has(foldText(word)))
    ? "each direction word one way"
    : undefined;
};

/**
 * Why a mapping's columns can't read a table of movements, or undefined when
 * they can: a role for each of the header's columns; one date and one
 * description; at most one balance and one reference; money read one way;
 * and direction words, each meaning one way, exactly with a direction column.
 */
export const mappingProblem = (mapping: MappingColumns): string | undefined =>
  mapping.columns.length === mapping.header.length
    ? (columnRolesProblem(mapping.columns) ?? wordsProblem(mapping))
    : "a role for each column";
