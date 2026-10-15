CREATE TABLE "records" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "records_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"date" date NOT NULL,
	"kind" text NOT NULL,
	"income_type" text,
	"amount" bigint NOT NULL,
	"memo" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "records_kind_check" CHECK ("records"."kind" IN ('income', 'expense', 'saving')),
	CONSTRAINT "records_income_type_check" CHECK ("records"."income_type" IS NULL OR "records"."income_type" IN ('salary', 'other')),
	CONSTRAINT "records_income_type_kind_check" CHECK (("records"."kind" = 'income') = ("records"."income_type" IS NOT NULL)),
	CONSTRAINT "records_amount_check" CHECK ("records"."amount" > 0 AND "records"."amount" <= 999999999),
	CONSTRAINT "records_memo_length_check" CHECK (char_length("records"."memo") <= 200)
);
--> statement-breakpoint
CREATE INDEX "records_date_idx" ON "records" USING btree ("date");