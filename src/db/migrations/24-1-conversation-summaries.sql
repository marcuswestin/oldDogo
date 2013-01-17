ALTER TABLE conversation_participation ADD COLUMN lastMessageTime INT UNSIGNED DEFAULT NULL AFTER account_id;
ALTER TABLE conversation_participation ADD COLUMN lastReceivedTime INT UNSIGNED DEFAULT NULL AFTER lastMessageTime;
ALTER TABLE conversation_participation ADD COLUMN lastReadTime INT UNSIGNED DEFAULT NULL AFTER lastReceivedTime;
ALTER TABLE conversation_participation ADD COLUMN summaryJson VARCHAR(8192) DEFAULT NULL AFTER lastReadTime;
