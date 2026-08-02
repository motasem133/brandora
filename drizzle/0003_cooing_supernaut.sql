ALTER TABLE "credit_packs" ADD COLUMN "price_aed" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "price_monthly_aed" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "price_yearly_aed" integer DEFAULT 0 NOT NULL;