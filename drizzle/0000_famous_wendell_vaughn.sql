CREATE TABLE `repository_votes` (
	`repository` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`repository`, `user_id`)
);
--> statement-breakpoint
CREATE INDEX `repository_votes_user_idx` ON `repository_votes` (`user_id`);