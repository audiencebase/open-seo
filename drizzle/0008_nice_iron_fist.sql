CREATE TABLE `gads_change_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`entity_name` text,
	`old_value` text,
	`new_value` text,
	`source` text DEFAULT 'ui' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `gads_change_log_project_idx` ON `gads_change_log` (`project_id`);--> statement-breakpoint
CREATE INDEX `gads_change_log_created_idx` ON `gads_change_log` (`created_at`);