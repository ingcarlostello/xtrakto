DROP INDEX "statements_one_version_key";--> statement-breakpoint
ALTER TABLE "statements" ADD COLUMN "card" jsonb;--> statement-breakpoint
CREATE UNIQUE INDEX "statements_one_version_key" ON "statements" USING btree ("account_id","period_from","period_to") WHERE "statements"."opening_balance_minor" is not null or "statements"."card" is not null;--> statement-breakpoint
ALTER TABLE "statements" ADD CONSTRAINT "statements_card_check" CHECK ("statements"."card" is null or jsonb_typeof("statements"."card") = 'object');