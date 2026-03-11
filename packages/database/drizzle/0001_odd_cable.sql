CREATE TABLE "accounts" (
	"userId" uuid NOT NULL,
	"type" varchar(255) NOT NULL,
	"provider" varchar(255) NOT NULL,
	"providerAccountId" varchar(255) NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" varchar(255),
	"scope" varchar(255),
	"id_token" text,
	"session_state" varchar(255),
	CONSTRAINT "accounts_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"currency" varchar(10) NOT NULL,
	"status" varchar(50) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"provider_payment_id" varchar(255),
	"receipt_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sessionToken" varchar(255) PRIMARY KEY NOT NULL,
	"userId" uuid NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verificationToken" (
	"identifier" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verificationToken_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "organization_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "display_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "call_tasks" ADD COLUMN "provider_call_id" varchar(160);--> statement-breakpoint
ALTER TABLE "outreach_activities" ADD COLUMN "provider" varchar(80);--> statement-breakpoint
ALTER TABLE "outreach_activities" ADD COLUMN "provider_message_id" varchar(160);--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "razorpay_customer_id" varchar(120);--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "razorpay_subscription_id" varchar(120);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "name" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "image" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "google_subject";