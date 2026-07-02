CREATE TABLE `goal_checks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`goal_id` integer NOT NULL,
	`date` text NOT NULL,
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `goal_day` ON `goal_checks` (`goal_id`,`date`);--> statement-breakpoint
CREATE TABLE `goals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`emoji` text DEFAULT '🎯' NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `income_sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#ec4899' NOT NULL,
	`archived` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `landing_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`source` text DEFAULT 'direct' NOT NULL,
	`target` text DEFAULT '' NOT NULL,
	`date` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `period_markers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`end_date` text NOT NULL,
	`name` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `plan_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`title` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`done` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `work_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`source_id` integer NOT NULL,
	`hours` real DEFAULT 0 NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `income_sources`(`id`) ON UPDATE no action ON DELETE no action
);
