ALTER TABLE "accounts" ADD COLUMN "reported_balance_minor" bigint;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "reported_balance_on" date;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_reported_balance_check" CHECK (("accounts"."reported_balance_minor" is null) = ("accounts"."reported_balance_on" is null));--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_reported_balance_minor_range" CHECK ("accounts"."reported_balance_minor" between -9007199254740991 and 9007199254740991);