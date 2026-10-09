CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"bank_id" text NOT NULL,
	"account_type" text NOT NULL,
	"last4" text,
	"currency" text NOT NULL,
	"display_name" text,
	"holder_name_normalized" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_id_user_id_key" UNIQUE("id","user_id"),
	CONSTRAINT "accounts_user_bank_type_last4_key" UNIQUE("user_id","bank_id","account_type","last4"),
	CONSTRAINT "accounts_account_type_check" CHECK ("accounts"."account_type" in ('savings', 'credit_card')),
	CONSTRAINT "accounts_currency_check" CHECK ("accounts"."currency" in ('COP')),
	CONSTRAINT "accounts_last4_check" CHECK ("accounts"."last4" ~ '^[0-9]{4}$')
);
--> statement-breakpoint
CREATE TABLE "ingestion_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid,
	"status" text DEFAULT 'pending' NOT NULL,
	"step" text,
	"format_id" text,
	"error_code" text,
	"extracted_content" jsonb,
	"stats" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ingestion_jobs_status_check" CHECK ("ingestion_jobs"."status" in ('pending', 'processing', 'done', 'failed')),
	CONSTRAINT "ingestion_jobs_content_deleted_check" CHECK ("ingestion_jobs"."status" not in ('done', 'failed') or "ingestion_jobs"."extracted_content" is null)
);
--> statement-breakpoint
CREATE TABLE "statements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"format_id" text NOT NULL,
	"period_from" date NOT NULL,
	"period_to" date NOT NULL,
	"opening_balance_minor" bigint,
	"closing_balance_minor" bigint,
	"total_credits_minor" bigint,
	"total_debits_minor" bigint,
	"interest_minor" bigint,
	"withholding_minor" bigint,
	"average_balance_minor" bigint,
	"balance_verified" boolean NOT NULL,
	"content_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "statements_id_account_user_key" UNIQUE("id","account_id","user_id"),
	CONSTRAINT "statements_account_content_key" UNIQUE("account_id","content_hash"),
	CONSTRAINT "statements_period_check" CHECK ("statements"."period_from" <= "statements"."period_to"),
	CONSTRAINT "statements_content_hash_check" CHECK ("statements"."content_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "statements_opening_balance_minor_range" CHECK ("statements"."opening_balance_minor" between -9007199254740991 and 9007199254740991),
	CONSTRAINT "statements_closing_balance_minor_range" CHECK ("statements"."closing_balance_minor" between -9007199254740991 and 9007199254740991),
	CONSTRAINT "statements_total_credits_minor_range" CHECK ("statements"."total_credits_minor" between -9007199254740991 and 9007199254740991),
	CONSTRAINT "statements_total_debits_minor_range" CHECK ("statements"."total_debits_minor" between -9007199254740991 and 9007199254740991),
	CONSTRAINT "statements_interest_minor_range" CHECK ("statements"."interest_minor" between -9007199254740991 and 9007199254740991),
	CONSTRAINT "statements_withholding_minor_range" CHECK ("statements"."withholding_minor" between -9007199254740991 and 9007199254740991),
	CONSTRAINT "statements_average_balance_minor_range" CHECK ("statements"."average_balance_minor" between -9007199254740991 and 9007199254740991)
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"statement_id" uuid NOT NULL,
	"date" date NOT NULL,
	"description_raw" text NOT NULL,
	"description_normalized" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"balance_after_minor" bigint,
	"reference_hash" text,
	"reference_kind" text,
	"category_id" text,
	"category_source" text,
	"kind" text,
	"fingerprint" text NOT NULL,
	"occurrence_index" integer NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_account_fingerprint_key" UNIQUE("account_id","fingerprint"),
	CONSTRAINT "transactions_reference_kind_check" CHECK ("transactions"."reference_kind" in ('phone', 'atm', 'code', 'none')),
	CONSTRAINT "transactions_category_source_check" CHECK ("transactions"."category_source" in ('rule', 'model', 'llm', 'user')),
	CONSTRAINT "transactions_kind_check" CHECK ("transactions"."kind" in ('spending', 'income', 'internal')),
	CONSTRAINT "transactions_category_pair_check" CHECK (("transactions"."category_id" is null) = ("transactions"."category_source" is null)),
	CONSTRAINT "transactions_reference_pair_check" CHECK (("transactions"."reference_hash" is null) = ("transactions"."reference_kind" is null or "transactions"."reference_kind" = 'none')),
	CONSTRAINT "transactions_fingerprint_check" CHECK ("transactions"."fingerprint" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "transactions_reference_hash_check" CHECK ("transactions"."reference_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "transactions_order_check" CHECK ("transactions"."occurrence_index" >= 0 and "transactions"."position" >= 0),
	CONSTRAINT "transactions_amount_minor_range" CHECK ("transactions"."amount_minor" between -9007199254740991 and 9007199254740991),
	CONSTRAINT "transactions_balance_after_minor_range" CHECK ("transactions"."balance_after_minor" between -9007199254740991 and 9007199254740991)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_user_id_key" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_jobs" ADD CONSTRAINT "ingestion_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_jobs" ADD CONSTRAINT "ingestion_jobs_account_fk" FOREIGN KEY ("account_id","user_id") REFERENCES "public"."accounts"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statements" ADD CONSTRAINT "statements_account_fk" FOREIGN KEY ("account_id","user_id") REFERENCES "public"."accounts"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_statement_fk" FOREIGN KEY ("statement_id","account_id","user_id") REFERENCES "public"."statements"("id","account_id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ingestion_jobs_user_created_idx" ON "ingestion_jobs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "transactions_user_date_idx" ON "transactions" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "transactions_account_date_idx" ON "transactions" USING btree ("account_id","date");--> statement-breakpoint
CREATE INDEX "transactions_statement_idx" ON "transactions" USING btree ("statement_id");