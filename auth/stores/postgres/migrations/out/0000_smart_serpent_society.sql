CREATE SCHEMA "auth";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth"."entities" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_id" varchar NOT NULL,
	"role_id" varchar NOT NULL,
	"conditions" jsonb,
	"filters" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth"."roles" (
	"id" varchar PRIMARY KEY NOT NULL,
	"tenant_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"permissions" varchar NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "entities_role_id_index" ON "auth"."entities" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "entities_entity_id_index" ON "auth"."entities" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "roles_tenant_id_index" ON "auth"."roles" USING btree ("tenant_id");