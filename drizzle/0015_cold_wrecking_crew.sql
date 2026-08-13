-- The `template` column was written on every insert and read by nothing.
--
-- It was meant to hold 'modern' | 'minimal' | 'luxury' and choose a layout, and
-- no code ever chose anything by it: every generated site was written as
-- 'modern' and the renderer never asked. What it was reaching for now exists
-- and is derived rather than stored — the register comes from the brand's style
-- and industry (see `src/lib/register.ts`), so a brand whose style is
-- regenerated gets a site that follows it, which a stored column never would.
ALTER TABLE "website_assets" DROP COLUMN "template";--> statement-breakpoint
DROP TYPE "public"."website_template";
