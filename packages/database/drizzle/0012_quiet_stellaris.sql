CREATE TABLE "sales_blueprints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"status" varchar(40) DEFAULT 'draft' NOT NULL,
	"business_profile" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"icp_summary" text DEFAULT '' NOT NULL,
	"buyer_roles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pain_points" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"disqualifiers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"qualification_rules" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_channels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"outreach_channels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"search_keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"monthly_lead_target" integer DEFAULT 100 NOT NULL,
	"meeting_target" integer DEFAULT 10 NOT NULL,
	"average_contract_value" integer DEFAULT 0 NOT NULL,
	"automation_mode" varchar(40) DEFAULT 'approval_gated' NOT NULL,
	"approval_required_for" jsonb DEFAULT '["first outreach","phone calls","new channels"]'::jsonb NOT NULL,
	"compliance_notes" text DEFAULT '' NOT NULL,
	"readiness_score" integer DEFAULT 0 NOT NULL,
	"readiness_gaps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sales_blueprints" ADD CONSTRAINT "sales_blueprints_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_blueprints" ADD CONSTRAINT "sales_blueprints_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sales_blueprints_workspace_unique" ON "sales_blueprints" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "sales_blueprints_workspace_status_idx" ON "sales_blueprints" USING btree ("workspace_id","status");