CREATE TABLE "contact_intake_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"intent" varchar(60) DEFAULT 'sales_assessment' NOT NULL,
	"status" varchar(40) DEFAULT 'new' NOT NULL,
	"priority" varchar(20) DEFAULT 'medium' NOT NULL,
	"qualification_score" integer DEFAULT 0 NOT NULL,
	"routing_recommendation" text NOT NULL,
	"name" varchar(160) NOT NULL,
	"email" varchar(255) NOT NULL,
	"company_name" varchar(160) NOT NULL,
	"website" varchar(255) DEFAULT '' NOT NULL,
	"role" varchar(120) DEFAULT '' NOT NULL,
	"team_size" varchar(80) DEFAULT '' NOT NULL,
	"monthly_lead_goal" integer DEFAULT 0 NOT NULL,
	"budget_range" varchar(40) DEFAULT 'not_sure' NOT NULL,
	"timeline" varchar(40) DEFAULT 'exploring' NOT NULL,
	"goals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"channels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"message" text NOT NULL,
	"source_path" varchar(255) DEFAULT '/contact' NOT NULL,
	"referrer" text DEFAULT '' NOT NULL,
	"utm" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "contact_intake_status_priority_idx" ON "contact_intake_submissions" USING btree ("status","priority");--> statement-breakpoint
CREATE INDEX "contact_intake_email_idx" ON "contact_intake_submissions" USING btree ("email");--> statement-breakpoint
CREATE INDEX "contact_intake_created_at_idx" ON "contact_intake_submissions" USING btree ("created_at");