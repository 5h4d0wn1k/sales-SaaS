CREATE TABLE "contact_suppressions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"channel" varchar(40) NOT NULL,
	"contact_value" varchar(255) NOT NULL,
	"normalized_contact_value" varchar(255) NOT NULL,
	"reason" varchar(80) DEFAULT 'manual' NOT NULL,
	"source" varchar(120) DEFAULT 'manual' NOT NULL,
	"created_by_user_id" uuid,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contact_suppressions" ADD CONSTRAINT "contact_suppressions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_suppressions" ADD CONSTRAINT "contact_suppressions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contact_suppressions_workspace_channel_contact_unique" ON "contact_suppressions" USING btree ("workspace_id","channel","normalized_contact_value");--> statement-breakpoint
CREATE INDEX "contact_suppressions_workspace_channel_idx" ON "contact_suppressions" USING btree ("workspace_id","channel");