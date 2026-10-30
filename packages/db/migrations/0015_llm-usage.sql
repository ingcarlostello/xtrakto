CREATE TABLE "llm_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"prompt_name" text NOT NULL,
	"prompt_version" integer NOT NULL,
	"model" text NOT NULL,
	"outcome" text NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"cost_micro_usd" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "llm_usage_outcome_check" CHECK ("llm_usage"."outcome" in ('OK', 'TIMEOUT', 'INVALID_OUTPUT', 'PROVIDER_ERROR')),
	CONSTRAINT "llm_usage_prompt_version_check" CHECK ("llm_usage"."prompt_version" > 0),
	CONSTRAINT "llm_usage_tokens_check" CHECK ("llm_usage"."input_tokens" >= 0 and "llm_usage"."output_tokens" >= 0),
	CONSTRAINT "llm_usage_cost_check" CHECK ("llm_usage"."cost_micro_usd" >= 0),
	CONSTRAINT "llm_usage_cost_micro_usd_range" CHECK ("llm_usage"."cost_micro_usd" between -9007199254740991 and 9007199254740991)
);
--> statement-breakpoint
ALTER TABLE "llm_usage" ADD CONSTRAINT "llm_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "llm_usage_user_created_idx" ON "llm_usage" USING btree ("user_id","created_at");