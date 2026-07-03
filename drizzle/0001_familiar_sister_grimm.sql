CREATE TABLE `site_content` (
	`id` integer PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
