CREATE TABLE "action_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"type" varchar(80) NOT NULL,
	"status" varchar(40) DEFAULT 'pending' NOT NULL,
	"risk_level" varchar(40) DEFAULT 'medium' NOT NULL,
	"title" varchar(180) NOT NULL,
	"detail" text NOT NULL,
	"proposed_by" varchar(40) DEFAULT 'system' NOT NULL,
	"target_kind" varchar(80) NOT NULL,
	"target_id" varchar(160),
	"target_label" varchar(180) NOT NULL,
	"payload_summary" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"guardrails" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"expected_effect" text NOT NULL,
	"rollback_plan" text NOT NULL,
	"required_role" "role" DEFAULT 'admin' NOT NULL,
	"requested_by" varchar(160),
	"created_by_user_id" uuid,
	"reviewed_by_user_id" uuid,
	"reviewed_by_name" varchar(160),
	"review_note" text,
	"audit_event_id" uuid,
	"reviewed_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "action_proposals" ADD CONSTRAINT "action_proposals_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_proposals" ADD CONSTRAINT "action_proposals_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_proposals" ADD CONSTRAINT "action_proposals_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "action_proposals_workspace_status_idx" ON "action_proposals" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "action_proposals_workspace_risk_idx" ON "action_proposals" USING btree ("workspace_id","risk_level");--> statement-breakpoint
CREATE INDEX "action_proposals_target_idx" ON "action_proposals" USING btree ("workspace_id","target_kind","target_id");