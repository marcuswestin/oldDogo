-- Executed on Jan 16 2013
ALTER TABLE conversation_participation CHANGE COLUMN summaryJson summaryJson VARCHAR(8192) NOT NULL;

ALTER TABLE conversation_participation DROP FOREIGN KEY conversation_participation_ibfk_3;
ALTER TABLE conversation_participation DROP KEY last_received_message_id;
ALTER TABLE conversation_participation DROP COLUMN last_received_message_id;

ALTER TABLE conversation_participation DROP FOREIGN KEY conversation_participation_ibfk_4;
ALTER TABLE conversation_participation DROP KEY last_read_message_id;
ALTER TABLE conversation_participation DROP COLUMN last_read_message_id;

ALTER TABLE conversation DROP FOREIGN KEY conversation_ibfk_1;
ALTER TABLE conversation DROP KEY last_message_id;
ALTER TABLE conversation DROP COLUMN last_message_id;