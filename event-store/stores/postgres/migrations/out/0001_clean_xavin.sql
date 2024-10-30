ALTER TABLE "event_store"."contexts" RENAME TO "relations";--> statement-breakpoint
DROP INDEX IF EXISTS "contexts_key_index";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "relations_key_index" ON "event_store"."relations" USING btree ("key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "relations_stream_index" ON "event_store"."relations" USING btree ("stream");