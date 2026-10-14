ALTER TABLE "statements" ADD COLUMN "balance_difference_minor" bigint;--> statement-breakpoint
ALTER TABLE "statements" ADD COLUMN "balance_break_positions" integer[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "reference_last4" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "covered_by_statement_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_covered_by_fk" FOREIGN KEY ("covered_by_statement_id","account_id","user_id") REFERENCES "public"."statements"("id","account_id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_one_unnumbered_key" ON "accounts" USING btree ("user_id","bank_id","account_type") WHERE "accounts"."last4" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "statements_one_version_key" ON "statements" USING btree ("account_id","period_from","period_to") WHERE "statements"."opening_balance_minor" is not null;--> statement-breakpoint
CREATE INDEX "transactions_covered_by_idx" ON "transactions" USING btree ("covered_by_statement_id") WHERE "transactions"."covered_by_statement_id" is not null;--> statement-breakpoint
ALTER TABLE "ingestion_jobs" DROP COLUMN "step";--> statement-breakpoint
ALTER TABLE "statements" ADD CONSTRAINT "statements_verified_balance_check" CHECK (not "statements"."balance_verified" or (coalesce("statements"."balance_difference_minor", 0) = 0 and cardinality("statements"."balance_break_positions") = 0));--> statement-breakpoint
ALTER TABLE "statements" ADD CONSTRAINT "statements_balance_difference_minor_range" CHECK ("statements"."balance_difference_minor" between -9007199254740991 and 9007199254740991);--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_reference_last4_check" CHECK ("transactions"."reference_last4" is null or ("transactions"."reference_last4" ~ '^[0-9]{4}$' and "transactions"."reference_hash" is not null));