ALTER TABLE message ADD COLUMN payloadJson VARCHAR(2048) DEFAULT NULL;
ALTER TABLE message ADD COLUMN type INT DEFAULT NULL;