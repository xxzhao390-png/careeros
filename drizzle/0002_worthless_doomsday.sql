CREATE TABLE `ai_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`feature` text NOT NULL,
	`model` text NOT NULL,
	`status` text NOT NULL,
	`input_hash` text NOT NULL,
	`result` text,
	`error_code` text,
	`duration_ms` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ai_runs_user_created_idx` ON `ai_runs` (`user_id`,`created_at`);