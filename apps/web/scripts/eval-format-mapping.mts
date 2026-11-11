// Runs the mapping proposal over @xtrakto/evals' invented bank formats, each
// model alone, and fails when one falls under the set's thresholds (11.2b).
// Each file's sample is what the browser sends: its header's names and its
// cells' shapes (ADR 0038), of invented files only; the report holds figures
// only. `pnpm --filter web eval` runs it after the categorization eval; it
// needs DEEPSEEK_API_KEY, from the root .env.local or the environment (CI).
import { existsSync } from "node:fs";
import {
  FORMAT_MAPPING_CASES,
  failedMappingThresholds,
  MAPPING_THRESHOLDS,
  type MappingCase,
  type MappingPrediction,
  mappingReport,
  scoreMappings,
} from "@xtrakto/evals";
import { formatSample, mappingFromRoles } from "@xtrakto/parsers";
import { proposeColumnRoles } from "../src/features/format-mappings/mapping-proposal.service";
import {
  AI_MODELS,
  type AiCallRecord,
  type AiError,
  type AiLedger,
  type AiModelId,
} from "../src/lib/ai";

const ENV_FILE = new URL("../../../.env.local", import.meta.url);
// The run's own cap, a slice of the DeepSeek credits.
const RUN_BUDGET_MICRO_USD = 300_000;
// Files asked at once, so a run fits CI's time.
const AT_ONCE = 4;

type Spend = { total: number };
type Proposal = { prediction: MappingPrediction; error?: AiError };

if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

// On every call the SDK warns that DeepSeek gets the answer's schema in its
// instructions (ADR 0031), which buries the report.
globalThis.AI_SDK_LOG_WARNINGS = false;

const write = (lines: readonly string[]) =>
  process.stdout.write(`${lines.join("\n")}\n`);

const usd = (microUsd: number) => `USD ${(microUsd / 1e6).toFixed(4)}`;

const costOf = ({ attempts }: AiCallRecord): number =>
  attempts.reduce((total, { usage }) => total + (usage?.costMicroUsd ?? 0), 0);

// No user pays for the eval: its spend counts against the run's cap.
const ledgerOf = (run: Spend, model: Spend): AiLedger => ({
  check: async () =>
    run.total >= RUN_BUDGET_MICRO_USD ? "PLATFORM_BUDGET" : undefined,
  record: async (call) => {
    const cost = costOf(call);
    run.total += cost;
    model.total += cost;
  },
});

// A file as the upload screen will ask about it: its sample, the model's
// roles, and the mapping the code makes with them.
const proposalFor = async (
  testCase: MappingCase,
  ledger: AiLedger,
  model: AiModelId,
): Promise<Proposal> => {
  const sample = formatSample(testCase.content);
  if (!sample.ok) return { prediction: { testCase } };
  const answer = await proposeColumnRoles({
    sample: sample.value,
    ledger,
    models: [model],
  });
  if (!answer.ok) return { prediction: { testCase }, error: answer.error };
  const { roles } = answer.value;
  const mapping = mappingFromRoles(testCase.content, roles);
  const proposed = mapping.ok ? { proposed: mapping.value } : {};
  return { prediction: { testCase, roles, ...proposed } };
};

const proposalsFor = async (model: AiModelId, ledger: AiLedger) => {
  const proposals: Proposal[] = [];
  for (let start = 0; start < FORMAT_MAPPING_CASES.length; start += AT_ONCE) {
    const batch = FORMAT_MAPPING_CASES.slice(start, start + AT_ONCE);
    proposals.push(
      ...(await Promise.all(
        batch.map((testCase) => proposalFor(testCase, ledger, model)),
      )),
    );
  }
  return proposals;
};

const evaluate = async (model: AiModelId, run: Spend): Promise<boolean> => {
  const spend = { total: 0 };
  const startedAt = Date.now();
  const proposals = await proposalsFor(model, ledgerOf(run, spend));
  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  const errors = proposals.flatMap(({ error }) => (error ? [error.code] : []));
  const stoppedBy = errors.find((code) => code !== "AI_FAILED");
  const score = scoreMappings(proposals.map(({ prediction }) => prediction));
  const files = proposals.length;
  write([
    `${model}: ${files} files in ${seconds} s, ${usd(spend.total)} at most, ${usd(spend.total / files)} a file`,
    ...mappingReport(score, MAPPING_THRESHOLDS).map((line) => `  ${line}`),
    `  failed calls ${errors.length}`,
    ...(stoppedBy ? [`  stopped: ${stoppedBy}`] : []),
    "",
  ]);
  return (
    !stoppedBy &&
    failedMappingThresholds(score, MAPPING_THRESHOLDS).length === 0
  );
};

const run: Spend = { total: 0 };
let passed = true;
for (const model of AI_MODELS) passed = (await evaluate(model, run)) && passed;
write([`run: ${usd(run.total)} at most, ${passed ? "passed" : "FAILED"}`]);
if (!passed) process.exitCode = 1;
