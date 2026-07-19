ALTER TABLE "analytics_events" ALTER COLUMN "event_type" SET DATA TYPE varchar(48) USING "event_type"::text;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD COLUMN "visitor_id" varchar(128);--> statement-breakpoint
ALTER TABLE "analytics_events" ADD COLUMN "event_name" varchar(128);--> statement-breakpoint
ALTER TABLE "analytics_events" ADD COLUMN "device_type" varchar(16);--> statement-breakpoint
ALTER TABLE "analytics_events" ADD COLUMN "browser" varchar(64);--> statement-breakpoint
ALTER TABLE "analytics_events" ADD COLUMN "os" varchar(64);--> statement-breakpoint
ALTER TABLE "analytics_events" ADD COLUMN "country_code" char(2);--> statement-breakpoint
ALTER TABLE "analytics_events" ADD COLUMN "region" varchar(128);--> statement-breakpoint
ALTER TABLE "analytics_events" ADD COLUMN "properties" jsonb;--> statement-breakpoint
CREATE INDEX "analytics_events_org_store_visitor_idx" ON "analytics_events" USING btree ("organization_id","store_id","visitor_id");--> statement-breakpoint
CREATE INDEX "analytics_events_org_store_name_time_idx" ON "analytics_events" USING btree ("organization_id","store_id","event_name","occurred_at");--> statement-breakpoint
DROP TYPE "public"."analytics_event_type";