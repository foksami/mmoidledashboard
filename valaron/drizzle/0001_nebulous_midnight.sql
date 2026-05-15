CREATE TABLE `activity_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`hashed_id` text NOT NULL,
	`action_type` text NOT NULL,
	`action_title` text,
	`started_at` text NOT NULL,
	`ended_at` text,
	`gold_start` integer,
	`gold_end` integer,
	`xp_snap_start` text,
	`xp_snap_end` text,
	`duration_sec` integer,
	FOREIGN KEY (`hashed_id`) REFERENCES `characters`(`hashed_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `activity_sess_idx` ON `activity_sessions` (`hashed_id`,`started_at`);