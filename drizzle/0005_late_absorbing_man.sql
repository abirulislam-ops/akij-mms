CREATE TABLE "competitor_metric" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer NOT NULL,
	"period_id" text NOT NULL,
	"metric" text NOT NULL,
	"value" double precision NOT NULL,
	"unit" text,
	"source" text,
	"is_estimate" boolean DEFAULT false NOT NULL,
	"entered_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "competitor_metric" ADD CONSTRAINT "competitor_metric_brand_id_brand_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brand"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitor_metric" ADD CONSTRAINT "competitor_metric_period_id_fiscal_period_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."fiscal_period"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "competitor_metric_brand_period_metric_idx" ON "competitor_metric" USING btree ("brand_id","period_id","metric");