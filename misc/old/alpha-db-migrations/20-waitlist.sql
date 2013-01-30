ALTER TABLE account CHANGE COLUMN facebook_id facebook_id BIGINT UNSIGNED DEFAULT NULL;
ALTER TABLE account ADD COLUMN waitlisted_time INT UNSIGNED DEFAULT NULL AFTER claimed_time;
ALTER TABLE account_email CHANGE COLUMN claimed_time claimed_time INT UNSIGNED DEFAULT NULL;
