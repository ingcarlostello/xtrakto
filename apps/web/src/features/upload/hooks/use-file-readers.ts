import { APP_ERROR_CODE, err } from "@xtrakto/core";
import type { FormatMapping, FormatSample, Result } from "@xtrakto/core";
import type { MappingChoices } from "@xtrakto/parsers";
import { useEffect, useRef } from "react";
import type { Dispatch } from "react";
import type { NoProposal } from "@/features/format-mappings/format-mapping.types";
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
// knows keeps its format, the latest correction's number and why there's no
// proposal, if there isn't, then the mapping the person confirmed.
type Reading = {
  readonly id: string;
  readonly worker: ExtractionWorker;
  readonly dispatch: Dispatch<UploadQueueAction>;
  readonly services: FormatServices;
  unknown?: UnknownFormat;
  revision: number;
  noProposal?: NoProposal;
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

// No mapping is saved for the format, or the saved one no longer reads the
// file: the LLM proposes roles from its sample, which the worker reads.
// Without them the person chooses (11.3b), unless the session ended.
const propose = async (reading: Reading, sample: FormatSample) => {
  const { id, dispatch, services } = reading;
  dispatch({ type: "formatProposing", id });
  const answer = await services
    .propose(sample)
    .catch((): typeof NO_ANSWER => NO_ANSWER);
  if (answer !== NO_ANSWER && answer.ok) {
    review(reading, { roles: answer.value.roles });
    return;
  }
  const noProposal = noProposalOf(answer === NO_ANSWER ? answer : answer.error);
  if (noProposal === undefined) {
    const error = { code: APP_ERROR_CODE.UNAUTHORIZED };
    dispatch({ type: "formatFailed", id, error });
    return;
  }
  reading.noProposal = noProposal;
  review(reading);
};

// A file no parser knows: read with the mapping saved for its format, when
// someone confirmed it, else proposed.
const settle = async (reading: Reading, format: UnknownFormat) => {
  const { id, worker, dispatch, services } = reading;
  reading.unknown = format;
  dispatch({ type: "formatUnknown", id });
  const saved = await services.findSaved(format.header).catch(() => undefined);
  const mapping = saved?.ok ? saved.value.mapping : null;
  if (mapping) worker.postMessage({ type: "read", mapping }, []);
  else await propose(reading, format.sample);
};

// What a mapping read: the person's confirmed one ends the file either way;
// a saved one that no longer reads it makes way for a proposal.
const onRead = (reading: Reading, result: Result<ExtractedStatement>) => {
  const { confirmed, unknown } = reading;
  if (confirmed || result.ok || !unknown) finish(reading, result);
  else void propose(reading, unknown.sample);
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
      void settle(reading, message.format);
      return;
    case "read":
      onRead(reading, message.result);
      return;
    case "reviewed": {
      const { revision, result } = message;
      const { noProposal } = reading;
      const why = noProposal === undefined ? {} : { noProposal };
      dispatch({ type: "formatReviewed", id, revision, result, ...why });
    }
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
 * one whose file no parser knows keeps it while its format is looked up,
 * proposed and confirmed (11.3a), so the file never leaves it.
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
