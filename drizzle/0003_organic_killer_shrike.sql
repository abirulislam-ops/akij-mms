CREATE TABLE "competitor_activity" (
	"id" serial PRIMARY KEY NOT NULL,
	"sbu_id" integer NOT NULL,
	"brand_id" integer NOT NULL,
	"activity_date" text NOT NULL,
	"activity_type" text NOT NULL,
	"channel" text,
	"spend" numeric(18, 2),
	"reach" double precision,
	"price_change_pct" double precision,
	"message" text,
	"notes" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competitor_profile" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer NOT NULL,
	"positioning" text,
	"threat_level" text DEFAULT 'med' NOT NULL,
	"price_index" double precision,
	"strengths" text,
	"weaknesses" text,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "competitor_activity" ADD CONSTRAINT "competitor_activity_sbu_id_sbu_id_fk" FOREIGN KEY ("sbu_id") REFERENCES "public"."sbu"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitor_activity" ADD CONSTRAINT "competitor_activity_brand_id_brand_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brand"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitor_profile" ADD CONSTRAINT "competitor_profile_brand_id_brand_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brand"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "competitor_activity_sbu_idx" ON "competitor_activity" USING btree ("sbu_id");--> statement-breakpoint
CREATE INDEX "competitor_activity_brand_idx" ON "competitor_activity" USING btree ("brand_id");--> statement-breakpoint
CREATE UNIQUE INDEX "competitor_profile_brand_idx" ON "competitor_profile" USING btree ("brand_id");