CREATE TABLE "notice_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"upload_ready" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ingestion_jobs" ADD COLUMN "notice_pending" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "notice_preferences" ADD CONSTRAINT "notice_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;