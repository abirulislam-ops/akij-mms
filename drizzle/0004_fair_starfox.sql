CREATE TABLE "digital_presence" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer NOT NULL,
	"period_id" text NOT NULL,
	"website" text,
	"social_channels" integer,
	"content_depth" text,
	"presence_score" double precision,
	"source" text
);
--> statement-breakpoint
CREATE TABLE "playbook" (
	"id" serial PRIMARY KEY NOT NULL,
	"sbu_id" integer NOT NULL,
	"fy" text NOT NULL,
	"positioning" text,
	"objectives" jsonb,
	"where_play" jsonb,
	"how_win" text,
	"right_to_win" text,
	"icp" jsonb,
	"priority_kpis" jsonb,
	"growth_mechanism" jsonb,
	"activity_matrix" jsonb,
	"insights" jsonb,
	"actions" jsonb,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "digital_presence" ADD CONSTRAINT "digital_presence_brand_id_brand_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brand"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_presence" ADD CONSTRAINT "digital_presence_period_id_fiscal_period_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."fiscal_period"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook" ADD CONSTRAINT "playbook_sbu_id_sbu_id_fk" FOREIGN KEY ("sbu_id") REFERENCES "public"."sbu"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "digital_presence_brand_period_idx" ON "digital_presence" USING btree ("brand_id","period_id");--> statement-breakpoint
CREATE UNIQUE INDEX "playbook_sbu_fy_idx" ON "playbook" USING btree ("sbu_id","fy");