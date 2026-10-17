CREATE TABLE "user_category_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"description_folded" text,
	"direction" text,
	"reference_hash" text,
	"reference_last4" text,
	"category_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_category_rules_target_check" CHECK (("user_category_rules"."description_folded" is null) <> ("user_category_rules"."reference_hash" is null)),
	CONSTRAINT "user_category_rules_direction_check" CHECK (("user_category_rules"."description_folded" is null) = ("user_category_rules"."direction" is null)),
	CONSTRAINT "user_category_rules_direction_value_check" CHECK ("user_category_rules"."direction" in ('in', 'out')),
	CONSTRAINT "user_category_rules_description_check" CHECK ("user_category_rules"."description_folded" not in ('', '0')),
	CONSTRAINT "user_category_rules_reference_hash_check" CHECK ("user_category_rules"."reference_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "user_category_rules_reference_last4_check" CHECK ("user_category_rules"."reference_last4" is null or ("user_category_rules"."reference_last4" ~ '^[0-9]{4}$' and "user_category_rules"."reference_hash" is not null))
);
--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_category_rule_check";--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_pending_review_check";--> statement-breakpoint
ALTER TABLE "user_category_rules" ADD CONSTRAINT "user_category_rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_category_rules_description_key" ON "user_category_rules" USING btree ("user_id","direction","description_folded") WHERE "user_category_rules"."description_folded" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "user_category_rules_reference_key" ON "user_category_rules" USING btree ("user_id","reference_hash") WHERE "user_category_rules"."reference_hash" is not null;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_rule_check" CHECK ((not ("transactions"."category_source" is not distinct from 'rule') or "transactions"."category_rule_id" is not null) and ("transactions"."category_rule_id" is null or ("transactions"."category_source" is not distinct from 'rule') or ("transactions"."category_source" is not distinct from 'user')));--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_pending_review_check" CHECK (not "transactions"."pending_review" or ("transactions"."category_source" is not distinct from 'rule'));