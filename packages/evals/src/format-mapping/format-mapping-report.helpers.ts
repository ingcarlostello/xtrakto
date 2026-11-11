import type { MappingScore, MappingThresholds } from "./format-mapping.types";

const shareLine = (
  label: string,
  [share, count]: readonly [number, number],
  minimum: number,
): string =>
  `${label.padEnd(13)}${share.toFixed(3)} (${count})  min ${minimum.toFixed(2)}  ${share >= minimum ? "ok" : "BELOW"}`;

/**
 * A model's score on the mapping set as lines of figures only: the files
 * answered, the shares with every role right and read whole and added up
 * against their thresholds, and each role's accuracy, worst first. No
 * file's content goes in it.
 */
export const mappingReport = (
  score: MappingScore,
  thresholds: MappingThresholds,
): string[] => [
  `files ${score.files}, answered ${score.answered}`,
  shareLine(
    "roles right",
    [score.rolesRightShare, score.rolesRight],
    thresholds.rolesRightShare,
  ),
  shareLine(
    "read right",
    [score.readRightShare, score.readRight],
    thresholds.readRightShare,
  ),
  ...[...score.roleAccuracy]
    .sort(([a, x], [b, y]) => x - y || a.localeCompare(b))
    .map(([role, accuracy]) => `  ${role.padEnd(12)}${accuracy.toFixed(2)}`),
];
