CREATE TABLE "usury_rates" (
	"month" date PRIMARY KEY NOT NULL,
	"rate_ea_ppm" integer NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usury_rates_month_check" CHECK (extract(day from "usury_rates"."month") = 1),
	CONSTRAINT "usury_rates_rate_check" CHECK ("usury_rates"."rate_ea_ppm" > 0 and "usury_rates"."rate_ea_ppm" <= 10000000),
	CONSTRAINT "usury_rates_source_check" CHECK (length("usury_rates"."source") between 1 and 300)
);
