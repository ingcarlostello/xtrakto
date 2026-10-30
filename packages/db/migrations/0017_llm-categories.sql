CREATE TABLE "llm_category_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prompt_name" text NOT NULL,
	"prompt_version" integer NOT NULL,
	"redacted_text" text NOT NULL,
	"direction" text NOT NULL,
	"category_id" text NOT NULL,
	"confidence" double precision NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "llm_category_answers_text_key" UNIQUE("prompt_name","prompt_version","direction","redacted_text"),
	CONSTRAINT "llm_category_answers_direction_check" CHECK ("llm_category_answers"."direction" in ('in', 'out')),
	CONSTRAINT "llm_category_answers_prompt_version_check" CHECK ("llm_category_answers"."prompt_version" > 0),
	CONSTRAINT "llm_category_answers_confidence_check" CHECK ("llm_category_answers"."confidence" between 0 and 1),
	CONSTRAINT "llm_category_answers_text_check" CHECK ("llm_category_answers"."redacted_text" <> '')
);
--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_category_rule_check";--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "llm_category_id" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_llm_category_check" CHECK (not ("transactions"."category_source" is not distinct from 'llm') or ("transactions"."llm_category_id" is not null and "transactions"."category_id" = "transactions"."llm_category_id"));--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_rule_check" CHECK ((not ("transactions"."category_source" is not distinct from 'rule') or "transactions"."category_rule_id" is not null) and ("transactions"."category_rule_id" is null or ("transactions"."category_source" is not distinct from 'rule') or ("transactions"."category_source" is not distinct from 'user') or ("transactions"."category_source" is not distinct from 'llm')));