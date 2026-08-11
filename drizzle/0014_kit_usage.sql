-- The social kit's photography stops being filed as social copy.
--
-- Not `ALTER TYPE ... ADD VALUE`, which is what drizzle-kit generates and what
-- this cannot use: Postgres refuses to *use* an enum value added in the same
-- transaction, drizzle-kit runs every pending migration in one transaction, and
-- the whole point of this migration is the backfill. Two files do not escape it
-- either — it is one transaction across all of them, which is how this was
-- found.
--
-- So the type is replaced rather than extended, and the cast that moves the
-- column to the new type carries the backfill in the same statement. `provider`
-- is an exact discriminator: every social row from fal is a photograph, because
-- the written captions go through OpenRouter, and it catches the failed
-- attempts too — they cost nothing and are still counted as calls.
ALTER TYPE "public"."ai_feature" RENAME TO "ai_feature_old";--> statement-breakpoint
CREATE TYPE "public"."ai_feature" AS ENUM('branding', 'website', 'social', 'kit', 'logo', 'assistant', 'vectorize', 'content');--> statement-breakpoint
ALTER TABLE "ai_usage" ALTER COLUMN "feature" TYPE "public"."ai_feature" USING (
  CASE
    WHEN "feature"::text = 'social' AND "provider"::text = 'fal' THEN 'kit'
    ELSE "feature"::text
  END
)::"public"."ai_feature";--> statement-breakpoint
DROP TYPE "public"."ai_feature_old";
