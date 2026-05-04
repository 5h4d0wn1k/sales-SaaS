CREATE TABLE "organization_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "role" DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "role" DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "active_workspace_id" uuid;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "organization_memberships_org_user_unique" ON "organization_memberships" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "organization_memberships_organization_id_idx" ON "organization_memberships" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "organization_memberships_user_id_idx" ON "organization_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_memberships_workspace_user_unique" ON "workspace_memberships" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX "workspace_memberships_workspace_id_idx" ON "workspace_memberships" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_memberships_user_id_idx" ON "workspace_memberships" USING btree ("user_id");--> statement-breakpoint
-- Backfill legacy single-tenant users into the additive membership model.
INSERT INTO "organization_memberships" ("organization_id", "user_id", "role")
SELECT
	"organization_id",
	"id",
	"role"
FROM "users"
WHERE "organization_id" IS NOT NULL
ON CONFLICT ("organization_id", "user_id") DO UPDATE
SET
	"role" = EXCLUDED."role",
	"updated_at" = now();--> statement-breakpoint
INSERT INTO "workspace_memberships" ("workspace_id", "user_id", "role")
SELECT
	"workspaces"."id",
	"users"."id",
	"users"."role"
FROM "users"
INNER JOIN "workspaces"
	ON "workspaces"."organization_id" = "users"."organization_id"
WHERE "users"."organization_id" IS NOT NULL
ON CONFLICT ("workspace_id", "user_id") DO UPDATE
SET
	"role" = EXCLUDED."role",
	"updated_at" = now();--> statement-breakpoint
WITH ranked_workspaces AS (
	SELECT DISTINCT ON ("users"."id")
		"users"."id" AS "user_id",
		"workspaces"."id" AS "workspace_id"
	FROM "users"
	INNER JOIN "workspaces"
		ON "workspaces"."organization_id" = "users"."organization_id"
	WHERE "users"."organization_id" IS NOT NULL
	ORDER BY "users"."id", "workspaces"."created_at" ASC, "workspaces"."id" ASC
)
UPDATE "users"
SET "active_workspace_id" = ranked_workspaces."workspace_id"
FROM ranked_workspaces
WHERE
	"users"."id" = ranked_workspaces."user_id"
	AND "users"."active_workspace_id" IS NULL;--> statement-breakpoint
-- Rollback note: keep legacy users.organization_id and users.role in place until the
-- application rollout and membership backfill have been verified in production.
ALTER TABLE "users" ADD CONSTRAINT "users_active_workspace_id_workspaces_id_fk" FOREIGN KEY ("active_workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_organization_id_idx" ON "users" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "users_active_workspace_id_idx" ON "users" USING btree ("active_workspace_id");--> statement-breakpoint
CREATE INDEX "workspaces_organization_id_idx" ON "workspaces" USING btree ("organization_id");
