import type { MovementTotal } from "../summary/summary.types";

/** Where some movements' money went: who was paid, however the bank wrote it. */
export type Place = {
  /**
   * Who was paid as the bank last wrote it, after its channel's words
   * ("APP DOMICILIOS"); the number paid, by its channel ("Nequi ••• 1270");
   * or the whole text when it names no one ("TRANSFERENCIAS A NEQUI").
   */
  readonly title: string;
  /** The ways the bank wrote it, the most used first, then the latest. */
  readonly bankTexts: readonly string[];
  /** Its movements added up, with their sign, and how many. */
  readonly total: MovementTotal;
};
