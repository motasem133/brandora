CREATE TABLE "site_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"message" text NOT NULL,
	"emailed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "site_messages" ADD CONSTRAINT "site_messages_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_messages" ADD CONSTRAINT "site_messages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "site_messages_project_created_idx" ON "site_messages" USING btree ("project_id","created_at");