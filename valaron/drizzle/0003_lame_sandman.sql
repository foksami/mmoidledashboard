CREATE TABLE `market_daily` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_hashed_id` text NOT NULL,
	`date` text NOT NULL,
	`avg_price` integer,
	`total_sold` integer,
	`fetched_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `market_daily_item_date_idx` ON `market_daily` (`item_hashed_id`,`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `market_daily_uniq` ON `market_daily` (`item_hashed_id`,`date`);