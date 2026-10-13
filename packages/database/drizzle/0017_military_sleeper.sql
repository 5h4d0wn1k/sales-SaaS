ALTER TABLE "meetings" ADD COLUMN "deal_value_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "deal_currency" varchar(3) DEFAULT 'USD' NOT NULL;