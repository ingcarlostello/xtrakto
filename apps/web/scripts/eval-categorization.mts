// Runs the categorization prompt over @xtrakto/evals' invented set, each
// model alone, and fails when one falls under the set's thresholds (8.4).
// Only invented texts go to DeepSeek from here, never a real one, and the
// report holds figures only. Run with `pnpm --filter web eval`; it needs
// DEEPSEEK_API_KEY, from the root .env.local or the environment (CI).
import { existsSync } from "node:fs";
import {
  CATEGORIZATION_CASES,
  CATEGORIZATION_THRESHOLDS,
  type CategorizationPrediction,
  categorizationReport,
  failedThresholds,
  scoreCategorization,
} from "@xtrakto/evals";
import { MIN_LLM_CONFIDENCE } from "../src/features/llm-categories/llm-categories.constants";
import { categorizeTexts } from "../src/features/llm-categories/llm-categories.service";
import {
  AI_MODELS,
  type AiCallRecord,
  type AiLedger,
  type AiModelId,
} from "../src/lib/ai";

const ENV_FILE = new URL("../../../.env.local", import.meta.url);
// The run's own cap, a slice of the DeepSeek credits: a run of both models
// costs about USD 0.04.
const RUN_BUDGET_MICRO_USD = 200_000;

type Spend = { total: number };

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

const evaluate = async (model: AiModelId, run: Spend): Promise<boolean> => {
  const spend = { total: 0 };
  const startedAt = Date.now();
  const { answers, stoppedBy } = await categorizeTexts({
    texts: CATEGORIZATION_CASES,
    ledger: ledgerOf(run, spend),
    models: [model],
  });
  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  const predictions: CategorizationPrediction[] = CATEGORIZATION_CASES.map(
    ({ expected }, index) => ({ expected, answer: answers.get(index) }),
  );
  const score = scoreCategorization(predictions, MIN_LLM_CONFIDENCE);
  const report = categorizationReport(score, CATEGORIZATION_THRESHOLDS);
  write([
    `${model}: ${predictions.length} texts in ${seconds} s, ${usd(spend.total)} at most`,
    ...report.map((line) => `  ${line}`),
    ...(stoppedBy ? [`  stopped: ${JSON.stringify(stoppedBy)}`] : []),
    "",
  ]);
  return (
    !stoppedBy &&
    failedThresholds(score, CATEGORIZATION_THRESHOLDS).length === 0
  );
};

const run: Spend = { total: 0 };
let passed = true;
for (const model of AI_MODELS) passed = (await evaluate(model, run)) && passed;
write([`run: ${usd(run.total)} at most, ${passed ? "passed" : "FAILED"}`]);
if (!passed) process.exitCode = 1;
