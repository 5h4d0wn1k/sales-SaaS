CREATE TABLE "ai_worker_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"worker_id" uuid NOT NULL,
	"status" varchar(40) DEFAULT 'proposed' NOT NULL,
	"title" varchar(180) NOT NULL,
	"detail" text NOT NULL,
	"risk_level" varchar(40) DEFAULT 'medium' NOT NULL,
	"proposed_action" text NOT NULL,
	"expected_cost_cents" integer DEFAULT 0 NOT NULL,
	"actual_cost_cents" integer DEFAULT 0 NOT NULL,
	"approval_proposal_id" uuid,
	"result_summary" text,
	"blocked_reason" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_workers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"role" varchar(120) NOT NULL,
	"status" varchar(40) DEFAULT 'active' NOT NULL,
	"risk_level" varchar(40) DEFAULT 'medium' NOT NULL,
	"owner_role" "role" DEFAULT 'admin' NOT NULL,
	"description" text NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"allowed_tools" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"blocked_tools" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"monthly_budget_cents" integer DEFAULT 0 NOT NULL,
	"budget_used_cents" integer DEFAULT 0 NOT NULL,
	"last_action_at" timestamp with time zone,
	"guardrails" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_worker_runs" ADD CONSTRAINT "ai_worker_runs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_worker_runs" ADD CONSTRAINT "ai_worker_runs_worker_id_ai_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."ai_workers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_worker_runs" ADD CONSTRAINT "ai_worker_runs_approval_proposal_id_action_proposals_id_fk" FOREIGN KEY ("approval_proposal_id") REFERENCES "public"."action_proposals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_workers" ADD CONSTRAINT "ai_workers_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_worker_runs_workspace_status_idx" ON "ai_worker_runs" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "ai_worker_runs_worker_status_idx" ON "ai_worker_runs" USING btree ("worker_id","status");--> statement-breakpoint
CREATE INDEX "ai_worker_runs_approval_proposal_idx" ON "ai_worker_runs" USING btree ("approval_proposal_id");--> statement-breakpoint
CREATE INDEX "ai_workers_workspace_status_idx" ON "ai_workers" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "ai_workers_workspace_risk_idx" ON "ai_workers" USING btree ("workspace_id","risk_level");