ALTER TABLE "deployment" ADD COLUMN "gitBranch" text;--> statement-breakpoint
ALTER TABLE "deployment" ADD COLUMN "gitCommitSha" text;--> statement-breakpoint
ALTER TABLE "deployment" ADD COLUMN "gitCommitMessage" text;--> statement-breakpoint
ALTER TABLE "deployment" ADD COLUMN "gitAuthor" text;--> statement-breakpoint
ALTER TABLE "deployment" ADD COLUMN "environment" text DEFAULT 'production';--> statement-breakpoint
ALTER TABLE "deployment" ADD COLUMN "deployUrl" text;--> statement-breakpoint
ALTER TABLE "domain" ADD COLUMN "dnsVerified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "domain" ADD COLUMN "dnsVerifiedAt" text;--> statement-breakpoint
ALTER TABLE "domain" ADD COLUMN "sslStatus" text DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "domain" ADD COLUMN "sslCheckedAt" text;--> statement-breakpoint
ALTER TABLE "domain" ADD COLUMN "environment" text DEFAULT 'production';
