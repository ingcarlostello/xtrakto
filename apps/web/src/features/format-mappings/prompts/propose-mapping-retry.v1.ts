import type { AiPrompt } from "@/lib/ai";
import {
  PROPOSE_MAPPING_V1,
  type ProposeMappingAnswer,
} from "./propose-mapping.v1";

const AGAIN = `You named this table's columns before, and the app read the file with your roles: it failed. After the columns, the input says your roles before and what failed, in words, never with a value of the file. Answer every column's role again, changing what failed, and keep a role that didn't fail when it still fits.
- Cells that don't read as dates aren't the date; cells that don't read as amounts aren't an amount, money_out, money_in or balance.
- When the balance doesn't follow the movements, the app already read money_out and money_in the other way round, and a column you called none as an amount's direction, and neither made it follow: look again at which column is the balance (the one each movement changes) and which hold the amounts.`;

/**
 * The second proposal for a table whose first one didn't read it or add up
 * (11.4): v1's instructions, then the roles it gave and what failed, in
 * codes put into words (ADR 0038).
 */
export const PROPOSE_MAPPING_RETRY_V1: AiPrompt<ProposeMappingAnswer> = {
  ...PROPOSE_MAPPING_V1,
  name: "propose-mapping-retry",
  version: 1,
  instructions: `${PROPOSE_MAPPING_V1.instructions}\n\n${AGAIN}`,
};

/** The words its input puts the roles before and what failed in. */
export const RETRY_INPUT_V1 = {
  rolesBefore: "Your roles before:",
  failed: "What failed:",
  aColumn: "a column",
  column: "column",
  unread: {
    date: "{column}'s cells don't read as dates.",
    amount: "{column}'s cells don't read as amounts.",
    direction: "{column}'s words don't say which way the money went.",
    empty: "{column} is empty in a row with a movement.",
    both_amounts: "a row has money in and money out at once.",
  },
  noMovements: "no row read as a movement.",
  balancesBreak:
    "the balance doesn't follow the movements in {percent}% of the rows.",
  closingOff: "the movements don't add up to the closing balance.",
} as const;
