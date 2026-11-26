CREATE TABLE "activity_kpi_link" (
	"id" serial PRIMARY KEY NOT NULL,
	"activity" text NOT NULL,
	"kpi_id" integer NOT NULL,
	"mode" text DEFAULT 'standalone' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alert" (
	"id" serial PRIMARY KEY NOT NULL,
	"sbu_id" integer,
	"severity" text NOT NULL,
	"rule" text NOT NULL,
	"message" text NOT NULL,
	"impact_bdt_cr" numeric(18, 2),
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"action" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"by_user" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand" (
	"id" serial PRIMARY KEY NOT NULL,
	"sbu_id" integer,
	"name" text NOT NULL,
	"is_competitor" boolean DEFAULT false NOT NULL,
	"is_own" boolean DEFAULT true NOT NULL,
	"website" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget_actual" (
	"id" serial PRIMARY KEY NOT NULL,
	"sbu_id" integer NOT NULL,
	"period_id" text NOT NULL,
	"channel" text,
	"value" numeric(18, 2) NOT NULL,
	"source" text
);
--> statement-breakpoint
CREATE TABLE "budget_plan" (
	"id" serial PRIMARY KEY NOT NULL,
	"sbu_id" integer NOT NULL,
	"period_id" text NOT NULL,
	"channel" text,
	"value" numeric(18, 2) NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign" (
	"id" serial PRIMARY KEY NOT NULL,
	"sbu_id" integer NOT NULL,
	"brand_id" integer,
	"name" text NOT NULL,
	"objective" text,
	"mode" text NOT NULL,
	"channel" text,
	"region" text,
	"start_date" text,
	"end_date" text,
	"message" text,
	"creative_link" text,
	"status" text DEFAULT 'plan' NOT NULL,
	"is_competitor" boolean DEFAULT false NOT NULL,
	"spend_planned" numeric(18, 2),
	"spend_actual" numeric(18, 2),
	"spend_estimated" boolean DEFAULT false NOT NULL,
	"source" text,
	"confidence" text DEFAULT 'Low' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_metric" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"reach" double precision,
	"grp" double precision,
	"impressions" double precision,
	"views" double precision,
	"engagement" double precision,
	"ctr" double precision,
	"leads" integer,
	"conversions" integer,
	"cost_per_result" numeric(18, 2),
	"brand_lift" double precision
);
--> statement-breakpoint
CREATE TABLE "data_gap" (
	"id" serial PRIMARY KEY NOT NULL,
	"sbu_id" integer,
	"item" text NOT NULL,
	"why_needed" text,
	"source" text,
	"owner" text,
	"priority" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision" (
	"id" serial PRIMARY KEY NOT NULL,
	"sbu_id" integer,
	"title" text NOT NULL,
	"what_happened" text,
	"why" text,
	"impact" text,
	"options" jsonb,
	"recommendation" text,
	"owner" text,
	"due_date" text,
	"status" text DEFAULT 'open' NOT NULL,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dimension" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"weight" double precision NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "distribution" (
	"id" serial PRIMARY KEY NOT NULL,
	"sbu_id" integer NOT NULL,
	"district" text,
	"upazila" text,
	"numeric_distribution" double precision,
	"weighted_distribution" double precision,
	"dealers" integer,
	"retailers" integer,
	"period_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fiscal_period" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"fy" text NOT NULL,
	"kind" text NOT NULL,
	"quarter" integer,
	"month" integer,
	"start_date" text,
	"end_date" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kpi_actual" (
	"id" serial PRIMARY KEY NOT NULL,
	"sbu_kpi_id" integer NOT NULL,
	"period_id" text NOT NULL,
	"value" double precision NOT NULL,
	"confidence" text DEFAULT 'Low' NOT NULL,
	"source" text,
	"as_of" text,
	"evidence_file" text,
	"entered_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kpi_definition" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"dimension_id" text NOT NULL,
	"definition" text,
	"formula" text,
	"unit" text,
	"direction" text DEFAULT 'higher' NOT NULL,
	"leading" boolean DEFAULT false NOT NULL,
	"core" boolean DEFAULT true NOT NULL,
	"measurement_method" text,
	"frequency" text,
	"owner_role" text,
	CONSTRAINT "kpi_definition_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "kpi_target" (
	"id" serial PRIMARY KEY NOT NULL,
	"sbu_kpi_id" integer NOT NULL,
	"period_id" text NOT NULL,
	"value" double precision NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_share" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer NOT NULL,
	"category" text NOT NULL,
	"period_id" text NOT NULL,
	"region" text,
	"value_share" double precision,
	"volume_share" double precision,
	"source" text,
	"is_estimate" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_size" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"period_id" text NOT NULL,
	"value" numeric(18, 2) NOT NULL,
	"volume" numeric(18, 2),
	"growth" double precision,
	"source" text,
	"is_estimate" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maturity_assessment" (
	"id" serial PRIMARY KEY NOT NULL,
	"sbu_id" integer NOT NULL,
	"assessed_at" text NOT NULL,
	"level" integer,
	"score" double precision,
	"dim_scores" jsonb,
	"criteria_results" jsonb
);
--> statement-breakpoint
CREATE TABLE "price_point" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer NOT NULL,
	"sku" text,
	"channel" text,
	"period_id" text NOT NULL,
	"price" numeric(18, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "research_metric" (
	"id" serial PRIMARY KEY NOT NULL,
	"wave_id" integer NOT NULL,
	"brand_id" integer NOT NULL,
	"metric" text NOT NULL,
	"value" double precision NOT NULL,
	"sample_size" integer
);
--> statement-breakpoint
CREATE TABLE "research_wave" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"wave_date" text NOT NULL,
	"agency" text
);
--> statement-breakpoint
CREATE TABLE "revenue_actual" (
	"id" serial PRIMARY KEY NOT NULL,
	"sbu_id" integer NOT NULL,
	"period_id" text NOT NULL,
	"value" numeric(18, 2) NOT NULL,
	"volume" numeric(18, 2),
	"unit" text,
	"source" text DEFAULT 'ERP/GL',
	"as_of" text
);
--> statement-breakpoint
CREATE TABLE "revenue_target" (
	"id" serial PRIMARY KEY NOT NULL,
	"sbu_id" integer NOT NULL,
	"period_id" text NOT NULL,
	"value" numeric(18, 2) NOT NULL,
	"volume" numeric(18, 2),
	"unit" text,
	"status" text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sbu" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"legal_name" text,
	"category" text,
	"business_model" text NOT NULL,
	"archetype" text,
	"custodian" text,
	"custodian_note" text,
	"business_head" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sbu_kpi" (
	"id" serial PRIMARY KEY NOT NULL,
	"sbu_id" integer NOT NULL,
	"kpi_id" integer NOT NULL,
	"weight_in_dimension" double precision NOT NULL,
	"four_p" text,
	"is_estimate" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategic_objective" (
	"id" serial PRIMARY KEY NOT NULL,
	"strategy_id" integer NOT NULL,
	"title" text NOT NULL,
	"detail" text,
	"numeric_target" numeric(18, 2),
	"unit" text
);
--> statement-breakpoint
CREATE TABLE "strategy" (
	"id" serial PRIMARY KEY NOT NULL,
	"sbu_id" integer NOT NULL,
	"fy" text NOT NULL,
	"summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upload_batch" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity" text NOT NULL,
	"file_name" text NOT NULL,
	"status" text DEFAULT 'validated' NOT NULL,
	"row_count" integer,
	"error_count" integer,
	"errors" jsonb,
	"by_user" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"role" text NOT NULL,
	"sbu_ids" jsonb,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "weight_set" (
	"id" serial PRIMARY KEY NOT NULL,
	"sbu_id" integer NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'proposed' NOT NULL,
	"weights" jsonb NOT NULL,
	"proposed_by" text,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_kpi_link" ADD CONSTRAINT "activity_kpi_link_kpi_id_kpi_definition_id_fk" FOREIGN KEY ("kpi_id") REFERENCES "public"."kpi_definition"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert" ADD CONSTRAINT "alert_sbu_id_sbu_id_fk" FOREIGN KEY ("sbu_id") REFERENCES "public"."sbu"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand" ADD CONSTRAINT "brand_sbu_id_sbu_id_fk" FOREIGN KEY ("sbu_id") REFERENCES "public"."sbu"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_actual" ADD CONSTRAINT "budget_actual_sbu_id_sbu_id_fk" FOREIGN KEY ("sbu_id") REFERENCES "public"."sbu"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_actual" ADD CONSTRAINT "budget_actual_period_id_fiscal_period_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."fiscal_period"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_plan" ADD CONSTRAINT "budget_plan_sbu_id_sbu_id_fk" FOREIGN KEY ("sbu_id") REFERENCES "public"."sbu"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_plan" ADD CONSTRAINT "budget_plan_period_id_fiscal_period_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."fiscal_period"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_sbu_id_sbu_id_fk" FOREIGN KEY ("sbu_id") REFERENCES "public"."sbu"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_brand_id_brand_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brand"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_metric" ADD CONSTRAINT "campaign_metric_campaign_id_campaign_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaign"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_gap" ADD CONSTRAINT "data_gap_sbu_id_sbu_id_fk" FOREIGN KEY ("sbu_id") REFERENCES "public"."sbu"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision" ADD CONSTRAINT "decision_sbu_id_sbu_id_fk" FOREIGN KEY ("sbu_id") REFERENCES "public"."sbu"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution" ADD CONSTRAINT "distribution_sbu_id_sbu_id_fk" FOREIGN KEY ("sbu_id") REFERENCES "public"."sbu"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution" ADD CONSTRAINT "distribution_period_id_fiscal_period_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."fiscal_period"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_actual" ADD CONSTRAINT "kpi_actual_sbu_kpi_id_sbu_kpi_id_fk" FOREIGN KEY ("sbu_kpi_id") REFERENCES "public"."sbu_kpi"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_actual" ADD CONSTRAINT "kpi_actual_period_id_fiscal_period_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."fiscal_period"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_definition" ADD CONSTRAINT "kpi_definition_dimension_id_dimension_id_fk" FOREIGN KEY ("dimension_id") REFERENCES "public"."dimension"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_target" ADD CONSTRAINT "kpi_target_sbu_kpi_id_sbu_kpi_id_fk" FOREIGN KEY ("sbu_kpi_id") REFERENCES "public"."sbu_kpi"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_target" ADD CONSTRAINT "kpi_target_period_id_fiscal_period_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."fiscal_period"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_share" ADD CONSTRAINT "market_share_brand_id_brand_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brand"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_share" ADD CONSTRAINT "market_share_period_id_fiscal_period_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."fiscal_period"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_size" ADD CONSTRAINT "market_size_period_id_fiscal_period_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."fiscal_period"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maturity_assessment" ADD CONSTRAINT "maturity_assessment_sbu_id_sbu_id_fk" FOREIGN KEY ("sbu_id") REFERENCES "public"."sbu"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_point" ADD CONSTRAINT "price_point_brand_id_brand_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brand"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_point" ADD CONSTRAINT "price_point_period_id_fiscal_period_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."fiscal_period"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_metric" ADD CONSTRAINT "research_metric_wave_id_research_wave_id_fk" FOREIGN KEY ("wave_id") REFERENCES "public"."research_wave"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_metric" ADD CONSTRAINT "research_metric_brand_id_brand_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brand"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_actual" ADD CONSTRAINT "revenue_actual_sbu_id_sbu_id_fk" FOREIGN KEY ("sbu_id") REFERENCES "public"."sbu"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_actual" ADD CONSTRAINT "revenue_actual_period_id_fiscal_period_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."fiscal_period"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_target" ADD CONSTRAINT "revenue_target_sbu_id_sbu_id_fk" FOREIGN KEY ("sbu_id") REFERENCES "public"."sbu"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_target" ADD CONSTRAINT "revenue_target_period_id_fiscal_period_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."fiscal_period"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sbu_kpi" ADD CONSTRAINT "sbu_kpi_sbu_id_sbu_id_fk" FOREIGN KEY ("sbu_id") REFERENCES "public"."sbu"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sbu_kpi" ADD CONSTRAINT "sbu_kpi_kpi_id_kpi_definition_id_fk" FOREIGN KEY ("kpi_id") REFERENCES "public"."kpi_definition"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategic_objective" ADD CONSTRAINT "strategic_objective_strategy_id_strategy_id_fk" FOREIGN KEY ("strategy_id") REFERENCES "public"."strategy"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategy" ADD CONSTRAINT "strategy_sbu_id_sbu_id_fk" FOREIGN KEY ("sbu_id") REFERENCES "public"."sbu"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weight_set" ADD CONSTRAINT "weight_set_sbu_id_sbu_id_fk" FOREIGN KEY ("sbu_id") REFERENCES "public"."sbu"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "brand_sbu_idx" ON "brand" USING btree ("sbu_id");--> statement-breakpoint
CREATE UNIQUE INDEX "budget_actual_unique_idx" ON "budget_actual" USING btree ("sbu_id","period_id","channel");--> statement-breakpoint
CREATE UNIQUE INDEX "budget_plan_unique_idx" ON "budget_plan" USING btree ("sbu_id","period_id","channel");--> statement-breakpoint
CREATE INDEX "campaign_sbu_mode_idx" ON "campaign" USING btree ("sbu_id","mode");--> statement-breakpoint
CREATE UNIQUE INDEX "kpi_actual_unique_idx" ON "kpi_actual" USING btree ("sbu_kpi_id","period_id");--> statement-breakpoint
CREATE UNIQUE INDEX "kpi_target_unique_idx" ON "kpi_target" USING btree ("sbu_kpi_id","period_id");--> statement-breakpoint
CREATE UNIQUE INDEX "market_share_unique_idx" ON "market_share" USING btree ("brand_id","category","period_id","region");--> statement-breakpoint
CREATE UNIQUE INDEX "market_size_unique_idx" ON "market_size" USING btree ("category","period_id");--> statement-breakpoint
CREATE UNIQUE INDEX "revenue_actual_unique_idx" ON "revenue_actual" USING btree ("sbu_id","period_id");--> statement-breakpoint
CREATE UNIQUE INDEX "revenue_target_unique_idx" ON "revenue_target" USING btree ("sbu_id","period_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sbu_code_idx" ON "sbu" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "sbu_kpi_unique_idx" ON "sbu_kpi" USING btree ("sbu_id","kpi_id");--> statement-breakpoint
CREATE UNIQUE INDEX "strategy_sbu_fy_idx" ON "strategy" USING btree ("sbu_id","fy");--> statement-breakpoint
CREATE UNIQUE INDEX "weight_set_sbu_version_idx" ON "weight_set" USING btree ("sbu_id","version");