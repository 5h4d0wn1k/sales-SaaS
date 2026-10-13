CREATE TABLE "telegram_notification_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"integration_id" uuid,
	"actor_id" uuid,
	"notification_type" varchar(80) NOT NULL,
	"mode" varchar(40) DEFAULT 'claimed' NOT NULL,
	"provider" varchar(40) DEFAULT 'telegram' NOT NULL,
	"chat_id_mask" varchar(80),
	"dry_run" boolean DEFAULT false NOT NULL,
	"target_chat_configured" boolean DEFAULT false NOT NULL,
	"target_chat_matches_workspace" boolean DEFAULT false NOT NULL,
	"rate_limit_limit" integer NOT NULL,
	"rate_limit_window_seconds" integer DEFAULT 3600 NOT NULL,
	"message_preview" text,
	"detail" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "telegram_notification_deliveries" ADD CONSTRAINT "telegram_notification_deliveries_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_notification_deliveries" ADD CONSTRAINT "telegram_notification_deliveries_integration_id_telegram_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."telegram_integrations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_notification_deliveries" ADD CONSTRAINT "telegram_notification_deliveries_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "telegram_notification_deliveries_workspace_created_at_idx" ON "telegram_notification_deliveries" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "telegram_notification_deliveries_workspace_type_created_at_idx" ON "telegram_notification_deliveries" USING btree ("workspace_id","notification_type","created_at");--> statement-breakpoint
CREATE INDEX "telegram_notification_deliveries_workspace_mode_created_at_idx" ON "telegram_notification_deliveries" USING btree ("workspace_id","mode","created_at");