import {
  type CategoryId,
  MONEY_DIRECTION,
  type MoneyDirection,
} from "@xtrakto/core";
import { sql } from "drizzle-orm";
import {
  check,
  doublePrecision,
  integer,
  pgTable,
  text,
  unique,
} from "drizzle-orm/pg-core";
import { isOneOf } from "../columns/check.utils";
import { createdAt, primaryId } from "../columns/column.utils";

// The LLM's answers, by the redacted text it read (8.5a): shared by every
// user and linked to none, so a text gets the answer another user's got
// without asking again. A new prompt version asks again.
export const llmCategoryAnswers = pgTable(
  "llm_category_answers",
  {
    id: primaryId(),
    promptName: text("prompt_name").notNull(),
    promptVersion: integer("prompt_version").notNull(),
    // A bank's text as the LLM read it, redacted with its holder's names.
    redactedText: text("redacted_text").notNull(),
    direction: text("direction").$type<MoneyDirection>().notNull(),
    categoryId: text("category_id").$type<CategoryId>().notNull(),
    // From 0 to 1. Kept under the threshold too, so the text isn't asked again.
    confidence: doublePrecision("confidence").notNull(),
    // The model that answered.
    model: text("model").notNull(),
    // What was paid, in plain words, from version 2 on (8.6b).
    title: text("title"),
    createdAt: createdAt(),
  },
  (t) => [
    unique("llm_category_answers_text_key").on(
      t.promptName,
      t.promptVersion,
      t.direction,
      t.redactedText,
    ),
    check(
      "llm_category_answers_direction_check",
      isOneOf(t.direction, Object.values(MONEY_DIRECTION)),
    ),
    check(
      "llm_category_answers_prompt_version_check",
      sql`${t.promptVersion} > 0`,
    ),
    check(
      "llm_category_answers_confidence_check",
      sql`${t.confidence} between 0 and 1`,
    ),
    check("llm_category_answers_text_check", sql`${t.redactedText} <> ''`),
    check(
      "llm_category_answers_title_check",
      sql`${t.title} is null or char_length(${t.title}) between 1 and 60`,
    ),
  ],
);
