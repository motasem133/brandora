-- A published site gets its own copy, so editing stops being publishing.
--
-- Until now the builder autosaved into `pages` — the column the live site reads
-- — and purged its cache, so on a published site every keystroke was public
-- within a second and a half, half-typed, with nothing in the product saying
-- so. `pages` stays the working copy the builder loads; these two hold what
-- visitors actually get.
--
-- Nullable on purpose: null means never published, which makes "is anything
-- waiting to go online" a question about a null rather than a diff of two
-- blobs.
ALTER TABLE "website_assets" ADD COLUMN "published_pages" jsonb;--> statement-breakpoint
ALTER TABLE "website_assets" ADD COLUMN "published_styles" jsonb;--> statement-breakpoint

-- Every site that is already live is, by definition, published exactly as it
-- stands. Without this backfill the first read after deploy would find null and
-- serve nothing to a site that has been up for weeks.
UPDATE "website_assets"
SET "published_pages" = "pages", "published_styles" = "custom_styles"
WHERE "is_published" = true;
