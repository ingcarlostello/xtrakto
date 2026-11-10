import type { BANKS } from "./bank.constants";

export type BankId = (typeof BANKS)[number]["id"];
