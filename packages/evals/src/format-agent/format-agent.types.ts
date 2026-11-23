import type { FormatMapping } from "@xtrakto/core";
import type { MappingCase } from "../format-mapping/format-mapping.types";

/**
 * Where a reading comes from in the format agent's loop (11.4): the first
 * proposal's roles, those once the code tried its repairs, and the reading
 * the person is shown, after a second proposal when the first didn't add up.
 */
export type AgentStage = "first" | "repaired" | "shown";

/**
 * How the format agent settled a case (11.5): the mapping each stage read the
 * whole file with, none where it didn't, and what its proposals cost.
 */
export type AgentRun = {
  readonly testCase: MappingCase;
  readonly readings: Readonly<Partial<Record<AgentStage, FormatMapping>>>;
  /** The LLM's proposals: two when the first didn't add up. */
  readonly proposals: number;
  readonly costMicroUsd: number;
};

/** The share of a set the loop must read right before the person looks. */
export type AgentThresholds = {
  readonly rightShare: number;
};

/** How the format agent did on a set, in figures only. */
export type AgentScore = {
  readonly files: number;
  /** The files read right at each stage. */
  readonly right: Readonly<Record<AgentStage, number>>;
  /** The share read right by the reading the person is shown. */
  readonly rightShare: number;
  /** The files whose reading the person has to correct. */
  readonly leftToPerson: number;
  readonly secondProposals: number;
  readonly proposalsPerFile: number;
  readonly costPerFileMicroUsd: number;
};
