CREATE TABLE `earned_achievements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`achievement_key` text NOT NULL,
	`instance_key` text DEFAULT '' NOT NULL,
	`coins` integer DEFAULT 0 NOT NULL,
	`earned_at` text DEFAULT (datetime('now')) NOT NULL,
	`seen` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `earned_achievement_instance` ON `earned_achievements` (`achievement_key`,`instance_key`);