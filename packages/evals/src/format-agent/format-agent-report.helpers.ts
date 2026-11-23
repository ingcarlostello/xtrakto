import type { AgentScore, AgentThresholds } from "./format-agent.types";

const usd = (microUsd: number): string => `USD ${(microUsd / 1e6).toFixed(4)}`;

const shareLine = (label: string, count: number, files: number): string =>
  `${label.padEnd(30)}${(files === 0 ? 0 : count / files).toFixed(3)} (${count})`;

/**
 * The format agent's score as lines of figures only: the files, proposals
 * and cost per file; the files read right after each stage of the loop, the
 * last against its threshold; and those left to the person. No file's
 * content goes in it.
 */
export const agentReport = (
  score: AgentScore,
  thresholds: AgentThresholds,
): string[] => {
  const { files, right } = score;
  const isMet = score.rightShare >= thresholds.rightShare;
  return [
    `files ${files}, second proposals ${score.secondProposals}, ${score.proposalsPerFile.toFixed(2)} proposals and ${usd(score.costPerFileMicroUsd)} a file`,
    shareLine("right after the 1st proposal", right.first, files),
    shareLine("right after its repairs", right.repaired, files),
    `${shareLine("right after the 2nd proposal", right.shown, files)}  min ${thresholds.rightShare.toFixed(2)}  ${isMet ? "ok" : "BELOW"}`,
    shareLine("left to the person", score.leftToPerson, files),
  ];
};
