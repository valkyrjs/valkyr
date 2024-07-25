CREATE TABLE `valkyr_contexts` (
	`key` text NOT NULL,
	`stream` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `valkyr_events` (
	`id` text PRIMARY KEY NOT NULL,
	`stream` text NOT NULL,
	`type` text NOT NULL,
	`data` text NOT NULL,
	`meta` text NOT NULL,
	`recorded` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `valkyr_snapshots` (
	`name` text NOT NULL,
	`stream` text NOT NULL,
	`cursor` text NOT NULL,
	`state` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `valkyr_contexts_key_idx` ON `valkyr_contexts` (`key`);--> statement-breakpoint
CREATE INDEX `valkyr_events_stream_idx` ON `valkyr_events` (`stream`);--> statement-breakpoint
CREATE INDEX `valkyr_events_type_idx` ON `valkyr_events` (`type`);--> statement-breakpoint
CREATE INDEX `valkyr_events_recorded_idx` ON `valkyr_events` (`recorded`);--> statement-breakpoint
CREATE INDEX `valkyr_events_created_idx` ON `valkyr_events` (`created`);--> statement-breakpoint
CREATE INDEX `valkyr_snapshots_name_stream_cursor_idx` ON `valkyr_snapshots` (`name`,`stream`,`cursor`);