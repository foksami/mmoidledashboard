CREATE TABLE `crafting_recipes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recipe_item_id` text NOT NULL,
	`recipe_item_name` text,
	`output_item_id` text NOT NULL,
	`output_item_name` text,
	`skill` text,
	`level_required` integer,
	`max_uses` integer,
	`exp_per_craft` integer,
	`materials` text,
	`recipe_vendor_price` integer,
	`fetched_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `crafting_recipes_recipe_item_id_unique` ON `crafting_recipes` (`recipe_item_id`);