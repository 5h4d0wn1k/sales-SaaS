ALTER TABLE "source_runs" ADD COLUMN "provider_mode" varchar(40) DEFAULT 'mock' NOT NULL;--> statement-breakpoint
ALTER TABLE "source_runs" ADD COLUMN "deduped_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "source_runs" ADD COLUMN "quality_score" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "source_runs" ADD COLUMN "evidence" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "source_runs" ADD COLUMN "rejection_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "source_runs" ADD COLUMN "compliance_checks" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "source_runs" ADD COLUMN "freshness" varchar(160) DEFAULT 'Not recorded' NOT NULL;--> statement-breakpoint
ALTER TABLE "source_runs" ADD COLUMN "next_action" varchar(180) DEFAULT 'Review source evidence before outreach.' NOT NULL;