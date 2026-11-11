import type { ColumnRole } from "@xtrakto/core";
import type { AiModelId } from "@/lib/ai";

/** The role the LLM gave each column of a sample, and the model that did. */
export type ProposedRoles = {
  readonly roles: readonly ColumnRole[];
  readonly model: AiModelId;
};
