ALTER TABLE message DROP COLUMN payload_type;
ALTER TABLE message CHANGE payload_id picture_id BIGINT UNSIGNED DEFAULT NULL;
