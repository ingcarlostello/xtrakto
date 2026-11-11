import type { MappingScore } from "./format-mapping.types";

/**
 * A model's score on the mapping set as lines of figures only: the files
 * answered, those with every role right, those read whole and added up, and
 * each role's accuracy, worst first. No file's content goes in it.
 */
export const mappingReport = (score: MappingScore): string[] => [
  `files ${score.files}, answered ${score.answered}`,
  `roles right  ${score.rolesRightShare.toFixed(3)} (${score.rolesRight})`,
  `read right   ${score.readRightShare.toFixed(3)} (${score.readRight})`,
  ...[...score.roleAccuracy]
    .sort(([a, x], [b, y]) => x - y || a.localeCompare(b))
    .map(([role, accuracy]) => `  ${role.padEnd(12)}${accuracy.toFixed(2)}`),
];
