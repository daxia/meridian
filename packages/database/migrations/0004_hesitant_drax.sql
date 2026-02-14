CREATE TABLE "system_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "newsletter" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "newsletter" CASCADE;--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "report_date" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "summary" text;--> statement-breakpoint
ALTER TABLE "reports" DROP COLUMN "title";--> statement-breakpoint
ALTER TABLE "reports" DROP COLUMN "total_articles";--> statement-breakpoint
ALTER TABLE "reports" DROP COLUMN "total_sources";--> statement-breakpoint
ALTER TABLE "reports" DROP COLUMN "used_articles";--> statement-breakpoint
ALTER TABLE "reports" DROP COLUMN "used_sources";--> statement-breakpoint
ALTER TABLE "reports" DROP COLUMN "tldr";--> statement-breakpoint
ALTER TABLE "reports" DROP COLUMN "clustering_params";--> statement-breakpoint
ALTER TABLE "reports" DROP COLUMN "model_author";