CREATE TABLE "analytics_daily_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"day" date NOT NULL,
	"metric" varchar(32) NOT NULL,
	"key" varchar(512) NOT NULL,
	"sessions" integer DEFAULT 0 NOT NULL,
	"events" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analytics_daily_metrics" ADD CONSTRAINT "analytics_daily_metrics_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_daily_metrics" ADD CONSTRAINT "analytics_daily_metrics_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_daily_metrics_unique_idx" ON "analytics_daily_metrics" USING btree ("organization_id","store_id","day","metric","key");--> statement-breakpoint
CREATE INDEX "analytics_daily_metrics_lookup_idx" ON "analytics_daily_metrics" USING btree ("organization_id","store_id","metric","day");