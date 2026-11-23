import { APP_ERROR_CODE, err, ok } from "@xtrakto/core";
import type { FormatMapping, Result } from "@xtrakto/core";
import type { MappingChoices } from "@xtrakto/parsers";
import { useEffect, useRef } from "react";
import type { Dispatch } from "react";
import {
  AGENT_START,
  nextStep,
} from "@/features/format-mappings/format-agent.helpers";
import type {
  AgentCommand,
  AgentEvent,
  AgentState,
} from "@/features/format-mappings/format-agent.types";
import type { MappingRetry } from "@/features/format-mappings/mapping-retry.schemas";
import { noProposalOf } from "../format-queue.helpers";
import { itemsToStart } from "../upload-queue.helpers";
import type { UploadQueueAction } from "../upload-queue.helpers";
import { FILE_PROBLEM, NO_ANSWER, UPLOAD_STATUS } from "../upload.constants";
import type {
  ExtractedStatement,
  ExtractionMessage,
  ExtractionWorker,
  FindSavedFormat,
  ProposeFormat,
  UnknownFormat,
  UploadItem,
} from "../upload.types";

/** The server actions that settle a format no parser knows, or stand-ins in tests. */
export type FormatServices = {
  readonly findSaved: FindSavedFormat;
  readonly propose: ProposeFormat;
};

// The file couldn't be read from disk, or its worker stopped unexpectedly.
const unreadable: Result<never> = err({
  code: APP_ERROR_CODE.PARSE_FAILED,
  details: { reason: FILE_PROBLEM.UNREADABLE },
});

// One file's reading, and what its worker answers for: a file no parser
// knows keeps its format and, while it's settled, where the format agent is
// (11.4); then the latest correction's number, and the mapping the person
// confirmed.
type Reading = {
  readonly id: string;
  readonly worker: ExtractionWorker;
  readonly dispatch: Dispatch<UploadQueueAction>;
  readonly services: FormatServices;
  unknown?: UnknownFormat;
  agent?: AgentState;
  /** What the saved mapping read, which finishes the file when it reads it. */
  saved?: Result<ExtractedStatement>;
  revision: number;
  confirmed?: FormatMapping;
};

const finish = (reading: Reading, result: Result<ExtractedStatement>) => {
  const { id, worker, dispatch, confirmed } = reading;
  worker.terminate();
  const mapping = confirmed ? { mapping: confirmed } : {};
  dispatch({ type: "finished", id, result, ...mapping });
};

// What choices make of the file its worker keeps; without them, only the date
// the code found.
const review = (reading: Reading, choices?: MappingChoices) => {
  const { worker, revision } = reading;
  const chosen = choices === undefined ? {} : { choices };
  worker.postMessage({ type: "review", revision, ...chosen }, []);
};

// The format agent's next step from what the page heard, and what it asks.
const step = (reading: Reading, event: AgentEvent) => {
  if (reading.agent === undefined) return;
  const next = nextStep(reading.agent, event);
  reading.agent = next.state;
  run(reading, next.command);
};

// The mapping saved for the file's format, the person's or everyone's.
const lookUp = async (reading: Reading, header: readonly string[]) => {
  const saved = await reading.services.findSaved(header).catch(() => undefined);
  const mapping = saved?.ok ? saved.value.mapping : null;
  step(reading, { type: "lookedUp", mapping });
};

// The LLM's roles for the file's sample, or again told what failed (11.4);
// without them, why, or nothing once the session ended.
const propose = async (reading: Reading, retry?: MappingRetry) => {
  const { id, dispatch, services, unknown } = reading;
  if (unknown === undefined) return;
  const again = retry === undefined ? {} : { isAgain: true };
  dispatch({ type: "formatProposing", id, ...again });
  const asked =
    retry === undefined
      ? services.propose(unknown.sample)
      : services.propose(unknown.sample, retry);
  const answer = await asked.catch((): typeof NO_ANSWER => NO_ANSWER);
  if (answer !== NO_ANSWER && answer.ok) {
    step(reading, { type: "proposed", roles: answer.value.roles });
    return;
  }
  const noProposal = noProposalOf(answer === NO_ANSWER ? answer : answer.error);
  const why = noProposal === undefined ? {} : { noProposal };
  step(reading, { type: "notProposed", ...why });
};

// Once the agent asks the person or ends, the file's next answers are the
// person's corrections.
const settled = (reading: Reading, command: AgentCommand) => {
  const { id, dispatch } = reading;
  reading.agent = undefined;
  if (command.type === "finish") finish(reading, reading.saved ?? unreadable);
  if (command.type === "fail") {
    dispatch({ type: "formatFailed", id, error: command.error });
  }
  if (command.type === "ask") {
    const { noProposal } = command;
    const why = noProposal === undefined ? {} : { noProposal };
    const result = ok(command.review);
    dispatch({ type: "formatReviewed", id, revision: 0, result, ...why });
  }
};

// Does what the format agent asks (11.4).
const run = (reading: Reading, command: AgentCommand) => {
  const { worker, unknown } = reading;
  switch (command.type) {
    case "lookUp":
      void lookUp(reading, unknown?.header ?? []);
      return;
    case "readSaved":
      worker.postMessage({ type: "read", mapping: command.mapping }, []);
      return;
    case "propose":
    case "proposeAgain":
      void propose(reading, "retry" in command ? command.retry : undefined);
      return;
    case "review":
      review(reading, command.choices);
      return;
    case "repair":
      worker.postMessage({ type: "repair", choices: command.choices }, []);
      return;
    default:
      settled(reading, command);
  }
};

// What a mapping read: the person's confirmed one ends the file either way;
// a saved one, as the agent says.
const onRead = (reading: Reading, result: Result<ExtractedStatement>) => {
  if (reading.agent === undefined) {
    finish(reading, result);
    return;
  }
  reading.saved = result;
  step(reading, { type: "savedRead", isRead: result.ok });
};

// A review answers the agent while it settles the format, then the person's
// latest correction.
const onReviewed = (
  reading: Reading,
  { revision, result }: Extract<ExtractionMessage, { type: "reviewed" }>,
) => {
  if (reading.agent !== undefined) {
    step(reading, { type: "reviewed", result });
    return;
  }
  reading.dispatch({
    type: "formatReviewed",
    id: reading.id,
    revision,
    result,
  });
};

const onMessage = (reading: Reading, message: ExtractionMessage) => {
  const { id, dispatch } = reading;
  switch (message.type) {
    case "stage":
      dispatch({ type: "stageReached", id, stage: message.stage });
      return;
    case "done":
      finish(reading, message.result);
      return;
    case "unknown":
      reading.unknown = message.format;
      reading.agent = AGENT_START.state;
      dispatch({ type: "formatUnknown", id });
      run(reading, AGENT_START.command);
      return;
    case "read":
      onRead(reading, message.result);
      return;
    case "reviewed":
      onReviewed(reading, message);
      return;
    case "repaired":
      step(reading, { type: "repaired", result: message.result });
  }
};

/** A file's worker, and what the page can ask of it. */
type FileReader = {
  readonly stop: () => void;
  /** Reads a file no parser knows again with the person's choices (11.3b). */
  readonly correct: (choices: MappingChoices) => void;
  /** Reads a file no parser knows with the mapping the person confirmed. */
  readonly confirm: (mapping: FormatMapping) => void;
};

// Reads the file here and hands the worker only its bytes, transferred rather
// than copied, and a PDF's password when there's one to try: the worker never
// sees the file's name.
const readFile = (item: UploadItem, reading: Reading): FileReader => {
  const { worker, dispatch } = reading;
  const password =
    item.status === UPLOAD_STATUS.WAITING ? item.password?.value : undefined;
  worker.onmessage = ({ data }) => onMessage(reading, data);
  worker.onerror = () => finish(reading, unreadable);
  dispatch({ type: "started", id: item.id });
  item.file.arrayBuffer().then(
    (bytes) => {
      const opener = password === undefined ? {} : { password };
      worker.postMessage({ type: "extract", bytes, ...opener }, [bytes]);
    },
    () => finish(reading, unreadable),
  );
  return {
    stop: () => worker.terminate(),
    correct: (choices) => {
      reading.revision += 1;
      const { revision } = reading;
      dispatch({ type: "formatCorrected", id: item.id, choices, revision });
      review(reading, choices);
    },
    confirm: (mapping) => {
      reading.confirmed = mapping;
      dispatch({ type: "formatConfirmed", id: item.id });
      worker.postMessage({ type: "read", mapping }, []);
    },
  };
};

type FileReadersOptions = {
  readonly items: readonly UploadItem[];
  /** A new worker for each file. */
  readonly createWorker: () => ExtractionWorker;
  readonly services: FormatServices;
  readonly dispatch: Dispatch<UploadQueueAction>;
};

/**
 * The workers that read the chosen files, one per file, at most three at a
 * time. A worker ends when its file is read, removed, or the screen closes;
 * one whose file no parser knows keeps it while the format agent settles its
 * format (11.4) and the person confirms it (11.3a), so the file never leaves
 * it.
 */
export const useFileReaders = ({
  items,
  createWorker,
  services,
  dispatch,
}: FileReadersOptions) => {
  const readers = useRef(new Map<string, FileReader>());

  useEffect(() => {
    for (const item of itemsToStart(items)) {
      const reading = {
        id: item.id,
        worker: createWorker(),
        dispatch,
        services,
        revision: 0,
      };
      readers.current.set(item.id, readFile(item, reading));
    }
  }, [items, createWorker, services, dispatch]);

  useEffect(() => {
    const running = readers.current;
    return () => {
      for (const reader of running.values()) reader.stop();
      running.clear();
    };
  }, []);

  const stop = (id: string) => {
    readers.current.get(id)?.stop();
    readers.current.delete(id);
  };
  const correct = (id: string, choices: MappingChoices) =>
    readers.current.get(id)?.correct(choices);
  const confirm = (id: string, mapping: FormatMapping) =>
    readers.current.get(id)?.confirm(mapping);
  return { stop, correct, confirm };
};
