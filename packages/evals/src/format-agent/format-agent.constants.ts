import type { AgentThresholds } from "./format-agent.types";

/**
 * The lowest share of the agent's set its loop reads right before the person
 * looks (11.5): a few points under the first run's 0.981, 52 of 53 files, so
 * two files more or less pass.
 */
export const AGENT_THRESHOLDS: AgentThresholds = { rightShare: 0.94 };

/**
 * The lowest share of the files whose names mislead read right: 3 of 5, as
 * the person must read the one without balances. A second proposal that
 * stops working fails it, which the whole set's share alone lets pass.
 */
export const MISLEADING_THRESHOLDS: AgentThresholds = { rightShare: 0.6 };
