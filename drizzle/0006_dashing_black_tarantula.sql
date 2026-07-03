CREATE TABLE `work_days` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`hours` real DEFAULT 0 NOT NULL,
	`note` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `work_days_date_unique` ON `work_days` (`date`);
--> statement-breakpoint
INSERT INTO `work_days` (`date`, `hours`, `note`)
	SELECT `date`, SUM(`hours`), '' FROM `work_entries` GROUP BY `date`;
--> statement-breakpoint
CREATE TABLE `__new_work_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`source_id` integer NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `income_sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_work_entries` (`date`, `source_id`, `amount`, `note`)
	SELECT `date`, `source_id`, SUM(`amount`), MAX(`note`)
	FROM `work_entries` GROUP BY `date`, `source_id`;
--> statement-breakpoint
DROP TABLE `work_entries`;
--> statement-breakpoint
ALTER TABLE `__new_work_entries` RENAME TO `work_entries`;
--> statement-breakpoint
CREATE UNIQUE INDEX `work_entry_date_source` ON `work_entries` (`date`,`source_id`);
