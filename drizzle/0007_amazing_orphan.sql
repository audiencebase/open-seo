CREATE TABLE `saved_advertisers` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`advertiser_id` text NOT NULL,
	`advertiser_name` text,
	`domain` text,
	`keyword` text NOT NULL,
	`location_code` integer DEFAULT 2840 NOT NULL,
	`ads_count` integer,
	`verified` integer,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `saved_advertisers_unique_project_advertiser` ON `saved_advertisers` (`project_id`,`advertiser_id`);--> statement-breakpoint
CREATE INDEX `saved_advertisers_project_created_idx` ON `saved_advertisers` (`project_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `saved_creatives` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`creative_id` text NOT NULL,
	`advertiser_id` text NOT NULL,
	`title` text,
	`url` text,
	`format` text,
	`preview_image` text,
	`first_shown` text,
	`last_shown` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `saved_creatives_unique_project_creative` ON `saved_creatives` (`project_id`,`creative_id`);--> statement-breakpoint
CREATE INDEX `saved_creatives_project_created_idx` ON `saved_creatives` (`project_id`,`created_at`);