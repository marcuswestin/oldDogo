ALTER TABLE message ADD COLUMN client_uid BIGINT UNSIGNED DEFAULT NULL AFTER sent_time;
ALTER TABLE account ADD COLUMN last_client_uid_block_start BIGINT UNSIGNED NOT NULL AFTER facebook_id;
ALTER TABLE account ADD COLUMN last_client_uid_block_end BIGINT UNSIGNED NOT NULL AFTER last_client_uid_block_start