CREATE TABLE `uploaded_files` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`object_key` text NOT NULL,
	`original_name` text NOT NULL,
	`content_type` text NOT NULL,
	`size` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uploaded_files_object_key_unique` ON `uploaded_files` (`object_key`);--> statement-breakpoint
CREATE INDEX `uploaded_files_user_idx` ON `uploaded_files` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
DROP INDEX `workspace_items_kind_idx`;--> statement-breakpoint
DROP INDEX `workspace_items_updated_idx`;--> statement-breakpoint
ALTER TABLE `workspace_items` ADD `user_id` text REFERENCES users(id);--> statement-breakpoint
CREATE INDEX `workspace_items_user_kind_idx` ON `workspace_items` (`user_id`,`kind`);--> statement-breakpoint
CREATE INDEX `workspace_items_user_updated_idx` ON `workspace_items` (`user_id`,`updated_at`);