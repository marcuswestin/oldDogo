ALTER TABLE conversation_participation ADD COLUMN last_received_message_id BIGINT UNSIGNED DEFAULT NULL;
ALTER TABLE conversation_participation ADD FOREIGN KEY (last_received_message_id) REFERENCES message(id);

ALTER TABLE conversation_participation ADD COLUMN last_read_message_id BIGINT UNSIGNED DEFAULT NULL;
ALTER TABLE conversation_participation ADD FOREIGN KEY (last_read_message_id) REFERENCES message(id);
