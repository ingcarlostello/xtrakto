ALTER TABLE "transactions" ADD COLUMN "category_rule_id" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "pending_review" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_rule_check" CHECK (("transactions"."category_rule_id" is null) = ("transactions"."category_source" is distinct from 'rule'));--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_pending_review_check" CHECK (not "transactions"."pending_review" or "transactions"."category_id" is not null);