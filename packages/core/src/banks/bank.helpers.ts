import { BANKS } from "./bank.constants";
import type { BankId } from "./bank.types";

const BANK_IDS: ReadonlySet<string> = new Set(BANKS.map(({ id }) => id));

/** Checks that a value is the id of one of the banks Xtrakto lists. */
export const isBankId = (value: unknown): value is BankId =>
  typeof value === "string" && BANK_IDS.has(value);
