CREATE TABLE `action_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`hashed_id` text NOT NULL,
	`action_type` text,
	`action_title` text,
	`started_at` text,
	`expires_at` text,
	`detected_at` text NOT NULL,
	FOREIGN KEY (`hashed_id`) REFERENCES `characters`(`hashed_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `action_log_idx` ON `action_log` (`hashed_id`,`detected_at`);--> statement-breakpoint
CREATE TABLE `ai_briefs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`hashed_id` text NOT NULL,
	`generated_at` text NOT NULL,
	`scope` text,
	`summary` text,
	`actions` text,
	`context_used` text,
	FOREIGN KEY (`hashed_id`) REFERENCES `characters`(`hashed_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `character_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`hashed_id` text NOT NULL,
	`taken_at` text NOT NULL,
	`total_level` integer,
	`gold` integer,
	`tokens` integer,
	`shards` integer,
	`current_status` text,
	`location_name` text,
	`raw` text,
	FOREIGN KEY (`hashed_id`) REFERENCES `characters`(`hashed_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `char_snap_idx` ON `character_snapshots` (`hashed_id`,`taken_at`);--> statement-breakpoint
CREATE TABLE `characters` (
	`hashed_id` text PRIMARY KEY NOT NULL,
	`numeric_id` integer NOT NULL,
	`name` text NOT NULL,
	`class` text,
	`is_primary` integer DEFAULT false,
	`created_at` text
);
--> statement-breakpoint
CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`hashed_id` text NOT NULL,
	`name` text,
	`metric` text,
	`metric_args` text,
	`target` real,
	`deadline` text,
	`created_at` text,
	`completed_at` text,
	FOREIGN KEY (`hashed_id`) REFERENCES `characters`(`hashed_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `items_catalog` (
	`hashed_id` text PRIMARY KEY NOT NULL,
	`name` text,
	`type` text,
	`quality` text,
	`vendor_price` integer,
	`is_tradeable` integer,
	`image_url` text,
	`stats` text,
	`requirements` text,
	`upgrade_requirements` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `market_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_hashed_id` text NOT NULL,
	`taken_at` text NOT NULL,
	`average_price` integer,
	`total_sold` integer,
	`tier` integer DEFAULT 1,
	`latest_price` integer,
	`latest_sold_at` text
);
--> statement-breakpoint
CREATE INDEX `market_snap_idx` ON `market_snapshots` (`item_hashed_id`,`taken_at`);--> statement-breakpoint
CREATE TABLE `skill_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`hashed_id` text NOT NULL,
	`taken_at` text NOT NULL,
	`skill_name` text NOT NULL,
	`level` integer,
	`experience` integer,
	FOREIGN KEY (`hashed_id`) REFERENCES `characters`(`hashed_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `skill_snap_idx` ON `skill_snapshots` (`hashed_id`,`skill_name`,`taken_at`);--> statement-breakpoint
CREATE TABLE `stat_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`hashed_id` text NOT NULL,
	`taken_at` text NOT NULL,
	`stat_name` text NOT NULL,
	`level` integer,
	`experience` integer,
	FOREIGN KEY (`hashed_id`) REFERENCES `characters`(`hashed_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `stat_snap_idx` ON `stat_snapshots` (`hashed_id`,`stat_name`,`taken_at`);