CREATE TYPE "public"."content_platform" AS ENUM('instagram', 'linkedin', 'x', 'facebook', 'tiktok', 'threads', 'youtube');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('generating', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."content_type" AS ENUM('social_post', 'carousel', 'story', 'platform_post', 'ad', 'campaign', 'blog');--> statement-breakpoint
ALTER TYPE "public"."ai_feature" ADD VALUE 'content';--> statement-breakpoint
CREATE TABLE "content_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" uuid NOT NULL,
	"created_by" text,
	"type" "content_type" NOT NULL,
	"platform" "content_platform",
	"status" "content_status" DEFAULT 'generating' NOT NULL,
	"title" text,
	"body" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"brief" text,
	"tone" text,
	"language" "locale" DEFAULT 'en' NOT NULL,
	"credits_reserved" integer DEFAULT 0 NOT NULL,
	"credits_charged" integer DEFAULT 0 NOT NULL,
	"model_used" text,
	"prompt_version" text,
	"error" text,
	"root_id" uuid NOT NULL,
	"parent_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"is_latest" boolean DEFAULT true NOT NULL,
	"edited_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "content_items_org_created_idx" ON "content_items" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "content_items_project_created_idx" ON "content_items" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "content_items_root_idx" ON "content_items" USING btree ("root_id","version");--> statement-breakpoint
CREATE INDEX "content_items_status_created_idx" ON "content_items" USING btree ("status","created_at");