ALTER TABLE message CHANGE COLUMN client_uid client_uid BIGINT UNSIGNED NOT NULL;
ALTER TABLE message ADD UNIQUE KEY index_sender_account_id_client_uid (sender_account_id, client_uid);
