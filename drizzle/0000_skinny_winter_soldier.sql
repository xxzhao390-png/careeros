CREATE TABLE `workspace_items` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `workspace_items_kind_idx` ON `workspace_items` (`kind`);--> statement-breakpoint
CREATE INDEX `workspace_items_updated_idx` ON `workspace_items` (`updated_at`);