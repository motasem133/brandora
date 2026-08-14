CREATE TYPE "public"."project_email_kind" AS ENUM('brand_nudge');--> statement-breakpoint
CREATE TABLE "project_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"kind" "project_email_kind" NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_emails" ADD CONSTRAINT "project_emails_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_emails_project_kind_key" ON "project_emails" USING btree ("project_id","kind");