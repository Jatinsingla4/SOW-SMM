ALTER TABLE brands ADD `caro_count` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE brands ADD `system_video_15s_count` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE brands ADD `system_video_30s_count` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE brands ADD `shoot_video_30s_count` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE brands ADD `shoot_video_1min_count` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE brands ADD `stories_count` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE brands ADD `influencer_count` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE jobs ADD `deliverable_type` text;--> statement-breakpoint
ALTER TABLE jobs ADD `quantity` integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE users ADD `client_id` integer REFERENCES clients(id);--> statement-breakpoint
CREATE UNIQUE INDEX `job_sow_idx` ON `jobs` (`sow_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `job_person_idx` ON `jobs` (`person`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `sow_brand_idx` ON `sow` (`brand_id`,`month`);--> statement-breakpoint
/*
 SQLite does not support "Creating foreign key on existing column" out of the box, we do not generate automatic migration for that, so it has to be done manually
 Please refer to: https://www.techonthenet.com/sqlite/tables/alter_table.php
                  https://www.sqlite.org/lang_altertable.html

 Due to that we don't generate migration automatically and it has to be done manually
*/