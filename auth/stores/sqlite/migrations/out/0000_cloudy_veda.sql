CREATE TABLE `valkyr_role_entities` (
	`role_id` text NOT NULL,
	`entity_id` text NOT NULL,
	`conditions` text,
	`filters` text
);
--> statement-breakpoint
CREATE TABLE `valkyr_roles` (
	`role_id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`permissions` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `valkry_role_entities_role_id_idx` ON `valkyr_role_entities` (`role_id`);--> statement-breakpoint
CREATE INDEX `valkry_role_entities_entity_id_idx` ON `valkyr_role_entities` (`entity_id`);--> statement-breakpoint
CREATE INDEX `valkyr_roles_tenant_id_idx` ON `valkyr_roles` (`tenant_id`);