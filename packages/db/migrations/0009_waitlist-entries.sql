CREATE TABLE "waitlist_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"consent_accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"consent_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "waitlist_entries_email_key" UNIQUE("email"),
	CONSTRAINT "waitlist_entries_email_check" CHECK ("waitlist_entries"."email" = lower(btrim("waitlist_entries"."email")) and char_length("waitlist_entries"."email") between 3 and 254),
	CONSTRAINT "waitlist_entries_name_check" CHECK ("waitlist_entries"."name" = btrim("waitlist_entries"."name") and char_length("waitlist_entries"."name") between 1 and 100),
	CONSTRAINT "waitlist_entries_consent_version_check" CHECK ("waitlist_entries"."consent_version" <> '')
);
