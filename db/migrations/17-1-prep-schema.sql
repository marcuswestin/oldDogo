ALTER TABLE account CHANGE COLUMN full_name full_name VARCHAR(255) DEFAULT NULL;
ALTER TABLE account CHANGE COLUMN first_name first_name VARCHAR(255) DEFAULT NULL;
ALTER TABLE account CHANGE COLUMN last_name last_name VARCHAR(255) DEFAULT NULL;
ALTER TABLE account CHANGE COLUMN created_time created_time INT UNSIGNED NOT NULL;
ALTER TABLE account CHANGE COLUMN claimed_time claimed_time INT UNSIGNED DEFAULT NULL;
ALTER TABLE conversation DROP COLUMN secret;
ALTER TABLE conversation ADD UNIQUE KEY index_accounts_reverse (account_2_id, account_1_id);
