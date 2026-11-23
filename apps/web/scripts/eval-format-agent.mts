// Runs the format agent's whole loop (11.4) over @xtrakto/evals' invented
// bank formats and those whose names mislead (11.5), as the upload screen
// runs it: the first proposal through lib/ai's models, the code's repairs as
// the file's worker tries them, a second proposal told what failed, and the
// reading the person would confirm. Every file is a format Xtrakto has never
// seen, so no saved mapping is looked up. Only invented files' names and
// shapes go to DeepSeek, and the report holds figures only. `pnpm --filter
// web eval` runs it after the mapping eval; it needs DEEPSEEK_API_KEY, from
// the root .env.local or the environment (CI).
import { existsSync } from "node:fs";
import type { FormatMapping, FormatSample } from "@xtrakto/core";
import {
  AGENT_THRESHOLDS,
  type AgentRun,
  agentReport,
  FORMAT_AGENT_CASES,
  isBelowAgentThresholds,
  type MappingCase,
  MISLEADING_CASES,
  MISLEADING_THRESHOLDS,
  scoreAgent,
} from "@xtrakto/evals";
import { formatSample, type MappingReview } from "@xtrakto/parsers";
import {
  AGENT_START,
  nextStep,
} from "../src/features/format-mappings/format-agent.helpers";
import type {
  AgentCommand,
  AgentEvent,
  AgentStep,
} from "../src/features/format-mappings/format-agent.types";
import { proposeColumnRoles } from "../src/features/format-mappings/mapping-proposal.service";
import { noProposalOf } from "../src/features/upload/format-queue.helpers";
import {
  repairReading,
  reviewReading,
} from "../src/features/upload/statement-extraction.helpers";
import type { AiCallRecord, AiError, AiLedger } from "../src/lib/ai";

const ENV_FILE = new URL("../../../.env.local", import.meta.url);
// The run's own cap, a slice of the DeepSeek credits.
const RUN_BUDGET_MICRO_USD = 200_000;
// Files settled at once, so a run fits CI's time.
const AT_ONCE = 4;

type Spend = { total: number };
type Proposing = Extract<AgentCommand, { type: "propose" | "proposeAgain" }>;

// One file's loop: its sample, who pays, and what it met on the way.
type FileLoop = {
  readonly testCase: MappingCase;
  readonly sample: FormatSample;
  readonly ledger: AiLedger;
  proposals: number;
  readonly errors: AiError["code"][];
  /** What the first proposal's roles read, before any repair. */
  first?: MappingReview;
};

type Settled = {
  readonly run: AgentRun;
  readonly errors: readonly AiError["code"][];
};

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
const ledgerOf = (spend: Spend, file: Spend): AiLedger => ({
  check: async () =>
    spend.total >= RUN_BUDGET_MICRO_USD ? "PLATFORM_BUDGET" : undefined,
  record: async (call) => {
    const cost = costOf(call);
    spend.total += cost;
    file.total += cost;
  },
});

// The LLM's roles for the file's sample, or again told what failed, as the
// upload screen asks them: lib/ai's models first, the stronger one again.
const propose = async (
  loop: FileLoop,
  command: Proposing,
): Promise<AgentEvent> => {
  loop.proposals += 1;
  const retry = command.type === "proposeAgain" ? { retry: command.retry } : {};
  const { sample, ledger } = loop;
  const answer = await proposeColumnRoles({ sample, ledger, ...retry });
  if (answer.ok) return { type: "proposed", roles: answer.value.roles };
  loop.errors.push(answer.error.code);
  const noProposal = noProposalOf(answer.error);
  return { type: "notProposed", ...(noProposal ? { noProposal } : {}) };
};

// Carries out what the agent asks as the upload screen's file readers do,
// in the file's worker or through the proposal; the answer is its next event.
const carryOut = async (
  loop: FileLoop,
  command: AgentCommand,
): Promise<AgentEvent> => {
  const { content } = loop.testCase;
  switch (command.type) {
    case "lookUp":
      return { type: "lookedUp", mapping: null };
    case "propose":
    case "proposeAgain":
      return propose(loop, command);
    case "review": {
      const result = reviewReading(content, command.choices);
      const isFirst = command.choices !== undefined && !loop.first;
      if (isFirst && result.ok) loop.first = result.value;
      return { type: "reviewed", result };
    }
    case "repair":
      return {
        type: "repaired",
        result: repairReading(content, command.choices),
      };
    default:
      throw new Error(`Nothing to carry out for ${command.type}.`);
  }
};

const mappingOf = (review?: MappingReview): FormatMapping | undefined =>
  review?.reading.ok ? review.reading.value.mapping : undefined;

// The mapping each stage read the whole file with: the first proposal's,
// once repaired, and the reading the person is shown.
const readingsOf = (loop: FileLoop, { state, command }: AgentStep) => {
  const first = mappingOf(loop.first);
  const repaired = mappingOf(state.attempts[0]);
  const shown = mappingOf(command.type === "ask" ? command.review : undefined);
  return {
    ...(first ? { first } : {}),
    ...(repaired ? { repaired } : {}),
    ...(shown ? { shown } : {}),
  };
};

// A file through the agent's loop, from looking its format up to the reading
// the person would confirm, or none.
const settle = async (
  testCase: MappingCase,
  spend: Spend,
): Promise<Settled> => {
  const sample = formatSample(testCase.content);
  if (!sample.ok) throw new Error(`No sample of ${testCase.name}.`);
  const file = { total: 0 };
  const ledger = ledgerOf(spend, file);
  const loop: FileLoop = {
    testCase,
    sample: sample.value,
    ledger,
    proposals: 0,
    errors: [],
  };
  let step: AgentStep = AGENT_START;
  while (step.command.type !== "ask" && step.command.type !== "fail") {
    step = nextStep(step.state, await carryOut(loop, step.command));
  }
  const readings = readingsOf(loop, step);
  const { proposals, errors } = loop;
  return {
    run: { testCase, readings, proposals, costMicroUsd: file.total },
    errors,
  };
};

const settleAll = async (spend: Spend): Promise<Settled[]> => {
  const settled: Settled[] = [];
  for (let start = 0; start < FORMAT_AGENT_CASES.length; start += AT_ONCE) {
    const batch = FORMAT_AGENT_CASES.slice(start, start + AT_ONCE);
    settled.push(
      ...(await Promise.all(batch.map((testCase) => settle(testCase, spend)))),
    );
  }
  return settled;
};

const spend: Spend = { total: 0 };
const startedAt = Date.now();
const settled = await settleAll(spend);
const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
const runs = settled.map(({ run }) => run);
const errors = settled.flatMap((each) => each.errors);
const stoppedBy = errors.find((code) => code !== "AI_FAILED");
const score = scoreAgent(runs);
const misleading = scoreAgent(
  runs.filter(({ testCase }) => MISLEADING_CASES.includes(testCase)),
);
const passed =
  !stoppedBy &&
  !isBelowAgentThresholds(score, AGENT_THRESHOLDS) &&
  !isBelowAgentThresholds(misleading, MISLEADING_THRESHOLDS);
write([
  `format agent: ${runs.length} files in ${seconds} s, ${usd(spend.total)} at most`,
  ...agentReport(score, AGENT_THRESHOLDS).map((line) => `  ${line}`),
  "  names that mislead:",
  ...agentReport(misleading, MISLEADING_THRESHOLDS).map(
    (line) => `    ${line}`,
  ),
  `  failed calls ${errors.length}`,
  ...(stoppedBy ? [`  stopped: ${stoppedBy}`] : []),
  "",
  `run: ${usd(spend.total)} at most, ${passed ? "passed" : "FAILED"}`,
]);
if (!passed) process.exitCode = 1;
