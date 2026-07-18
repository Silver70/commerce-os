CREATE TYPE "public"."analytics_event_type" AS ENUM('page_view', 'product_view', 'add_to_cart', 'checkout_start', 'purchase');--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"session_id" varchar(128) NOT NULL,
	"event_type" "analytics_event_type" NOT NULL,
	"product_id" uuid,
	"variant_id" uuid,
	"path" varchar(1024),
	"referrer" varchar(1024),
	"utm_source" varchar(255),
	"utm_medium" varchar(255),
	"utm_campaign" varchar(255),
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analytics_events_org_store_time_idx" ON "analytics_events" USING btree ("organization_id","store_id","occurred_at");--> statement-breakpoint
CREATE INDEX "analytics_events_org_store_session_idx" ON "analytics_events" USING btree ("organization_id","store_id","session_id");--> statement-breakpoint
CREATE INDEX "analytics_events_org_store_type_time_idx" ON "analytics_events" USING btree ("organization_id","store_id","event_type","occurred_at");