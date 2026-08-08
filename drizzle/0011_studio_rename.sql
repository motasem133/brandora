ALTER TABLE "plans" ADD COLUMN "max_custom_domains" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Pro becomes Studio. A rename, not a new row: same $49, same Polar product, and
-- `subscriptions.plan_id` keeps pointing at it. Guarded so a re-run is a no-op.
UPDATE "plans" SET "slug" = 'studio', "name" = 'Studio'
WHERE "slug" = 'pro' AND NOT EXISTS (SELECT 1 FROM "plans" WHERE "slug" = 'studio');
