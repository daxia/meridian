CREATE TABLE "system_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "newsletter" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "newsletter" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "total_articles" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "total_sources" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "used_articles" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "used_sources" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "created_at" SET DEFAULT now();