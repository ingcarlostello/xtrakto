ALTER TABLE "llm_category_answers" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "llm_title" text;--> statement-breakpoint
ALTER TABLE "llm_category_answers" ADD CONSTRAINT "llm_category_answers_title_check" CHECK ("llm_category_answers"."title" is null or char_length("llm_category_answers"."title") between 1 and 60);--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_llm_title_check" CHECK ("transactions"."llm_title" is null or "transactions"."llm_category_id" is not null);