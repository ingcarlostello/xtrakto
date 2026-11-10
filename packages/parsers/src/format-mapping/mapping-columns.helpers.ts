import { COLUMN_ROLE } from "@xtrakto/core";
import type { ColumnRole, FormatMapping } from "@xtrakto/core";

/** Where a mapping reads each role, by its column's position. */
export type MappedColumns = {
  readonly date: number;
  readonly description: number;
  readonly amount?: number;
  readonly moneyOut?: number;
  readonly moneyIn?: number;
  readonly direction?: number;
  readonly balance?: number;
  readonly reference?: number;
  /** Every column it reads. */
  readonly read: ReadonlySet<number>;
};

const positionOf = (
  mapping: FormatMapping,
  role: ColumnRole,
): number | undefined => {
  const index = mapping.columns.indexOf(role);
  return index === -1 ? undefined : index;
};

/** Where a mapping reads each role. */
export const mappedColumns = (mapping: FormatMapping): MappedColumns => ({
  // The mapping's schema requires one date and one description.
  date: positionOf(mapping, COLUMN_ROLE.DATE) ?? 0,
  description: positionOf(mapping, COLUMN_ROLE.DESCRIPTION) ?? 0,
  amount: positionOf(mapping, COLUMN_ROLE.AMOUNT),
  moneyOut: positionOf(mapping, COLUMN_ROLE.MONEY_OUT),
  moneyIn: positionOf(mapping, COLUMN_ROLE.MONEY_IN),
  direction: positionOf(mapping, COLUMN_ROLE.DIRECTION),
  balance: positionOf(mapping, COLUMN_ROLE.BALANCE),
  reference: positionOf(mapping, COLUMN_ROLE.REFERENCE),
  read: new Set(
    mapping.columns.flatMap((role, index) =>
      role === COLUMN_ROLE.NONE ? [] : [index],
    ),
  ),
});
