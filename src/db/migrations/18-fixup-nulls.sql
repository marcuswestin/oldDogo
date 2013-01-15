ALTER TABLE picture CHANGE COLUMN created_time created_time INT UNSIGNED NOT NULL;
ALTER TABLE picture CHANGE COLUMN uploaded_time uploaded_time INT UNSIGNED DEFAULT NULL;
ALTER TABLE conversation CHANGE COLUMN created_time created_time INT UNSIGNED NOT NULL;
ALTER TABLE message CHANGE COLUMN sent_time sent_time INT UNSIGNED NOT NULL;
