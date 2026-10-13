CREATE TABLE "telegram_integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"bot_username" varchar(120),
	"chat_id_hash" varchar(128) NOT NULL,
	"chat_id_mask" varchar(80) NOT NULL,
	"status" varchar(40) DEFAULT 'pending_verification' NOT NULL,
	"allowed_commands" jsonb DEFAULT '["status","approvals","providers","suppressions","help","pause"]'::jsonb NOT NULL,
	"created_by_user_id" uuid,
	"last_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "telegram_integrations" ADD CONSTRAINT "telegram_integrations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_integrations" ADD CONSTRAINT "telegram_integrations_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "telegram_integrations_workspace_unique" ON "telegram_integrations" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "telegram_integrations_chat_id_hash_unique" ON "telegram_integrations" USING btree ("chat_id_hash");--> statement-breakpoint
CREATE INDEX "telegram_integrations_chat_id_hash_idx" ON "telegram_integrations" USING btree ("chat_id_hash");--> statement-breakpoint
CREATE INDEX "telegram_integrations_workspace_status_idx" ON "telegram_integrations" USING btree ("workspace_id","status");