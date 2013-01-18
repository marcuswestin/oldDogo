-- Foreign keys
ALTER TABLE waitlist_event DROP FOREIGN KEY waitlist_event_ibfk_1;
ALTER TABLE account_email DROP FOREIGN KEY account_email_ibfk_1;
ALTER TABLE conversation DROP FOREIGN KEY conversation_ibfk_2;
ALTER TABLE conversation DROP FOREIGN KEY conversation_ibfk_3;
ALTER TABLE conversation_participation DROP FOREIGN KEY conversation_participation_ibfk_1;
ALTER TABLE conversation_participation DROP FOREIGN KEY conversation_participation_ibfk_2;
ALTER TABLE message DROP FOREIGN KEY message_ibfk_1;

-- account properties
ALTER TABLE account CHANGE COLUMN facebook_id facebookId BIGINT UNSIGNED DEFAULT NULL;
ALTER TABLE account CHANGE COLUMN last_client_uid_block_start lastClientUidBlockStart BIGINT UNSIGNED NOT NULL DEFAULT 0;
ALTER TABLE account CHANGE COLUMN last_client_uid_block_end lastClientUidBlockEnd BIGINT UNSIGNED NOT NULL DEFAULT 0;
ALTER TABLE account CHANGE COLUMN full_name fullName VARCHAR(255) DEFAULT NULL;
ALTER TABLE account CHANGE COLUMN first_name firstName VARCHAR(63) DEFAULT NULL;
ALTER TABLE account CHANGE COLUMN last_name lastName VARCHAR(63) DEFAULT NULL;
ALTER TABLE account CHANGE COLUMN push_token pushToken VARCHAR(255) DEFAULT NULL;
ALTER TABLE account CHANGE COLUMN push_system pushSystem ENUM('ios','android') DEFAULT NULL;
ALTER TABLE account CHANGE COLUMN created_time createdTime INT UNSIGNED NOT NULL;
ALTER TABLE account CHANGE COLUMN claimed_time claimedTime INT UNSIGNED DEFAULT NULL;
ALTER TABLE account CHANGE COLUMN waitlisted_time waitlistedTime INT UNSIGNED DEFAULT NULL;

-- waitlist_event properties
ALTER TABLE waitlist_event CHANGE COLUMN account_id personId BIGINT UNSIGNED NOT NULL;
ALTER TABLE waitlist_event CHANGE COLUMN user_agent userAgent VARCHAR(1024) DEFAULT NULL;

-- account_email properties
ALTER TABLE account_email CHANGE COLUMN account_id personId BIGINT UNSIGNED NOT NULL;
ALTER TABLE account_email CHANGE COLUMN email_address emailAddress VARCHAR(255) NOT NULL;
ALTER TABLE account_email CHANGE COLUMN created_time createdTime INT UNSIGNED NOT NULL;
ALTER TABLE account_email CHANGE COLUMN claimed_time claimedTime INT UNSIGNED DEFAULT NULL;

-- conversation properties
ALTER TABLE conversation CHANGE COLUMN account_1_id person1Id BIGINT UNSIGNED NOT NULL;
ALTER TABLE conversation CHANGE COLUMN account_2_id person2Id BIGINT UNSIGNED NOT NULL;
ALTER TABLE conversation CHANGE COLUMN created_time createdTime INT UNSIGNED NOT NULL;

-- conversation_participation properties
ALTER TABLE conversation_participation CHANGE COLUMN conversation_id conversationId BIGINT UNSIGNED NOT NULL;
ALTER TABLE conversation_participation CHANGE COLUMN account_id personId BIGINT UNSIGNED NOT NULL;

-- message properties
ALTER TABLE message CHANGE COLUMN sender_account_id senderPersonId BIGINT UNSIGNED NOT NULL;
ALTER TABLE message CHANGE COLUMN conversation_id conversationId BIGINT UNSIGNED NOT NULL;
ALTER TABLE message CHANGE COLUMN sent_time sentTime INT UNSIGNED NOT NULL;
ALTER TABLE message CHANGE COLUMN client_uid clientUid BIGINT UNSIGNED NOT NULL;

-- table names
RENAME TABLE account TO person;
RENAME TABLE waitlist_event TO waitlistEvent;
RENAME TABLE account_email TO personEmail;
RENAME TABLE conversation_participation TO conversationParticipation;

-- drop foreign key indexes
ALTER TABLE waitlistEvent DROP KEY account_id;

-- rename keys
ALTER TABLE person DROP KEY index_facebook_id;
ALTER TABLE person ADD KEY keyFacebookId (facebookId);
ALTER TABLE personEmail DROP KEY index_email_address;
ALTER TABLE personEmail ADD KEY keyEmailAddress (emailAddress);
ALTER TABLE personEmail DROP KEY account_id;
ALTER TABLE conversation DROP KEY index_accounts;
ALTER TABLE conversation ADD KEY keyRelationship (person1Id, person2Id);
ALTER TABLE conversation DROP KEY index_accounts_reverse;
ALTER TABLE conversation ADD KEY keyRelationshipReverse (person2Id, person1Id);
ALTER TABLE conversationParticipation DROP KEY index_account_conversation;
ALTER TABLE conversationParticipation ADD KEY keyPersonIdConversationId (personId, conversationId);
ALTER TABLE conversationParticipation DROP KEY conversation_id;
ALTER TABLE conversationParticipation ADD KEY keyConversationId (conversationId);
ALTER TABLE message DROP KEY index_sender_account_id_client_uid;
ALTER TABLE message ADD KEY keyPersonClientUid (senderPersonId, clientUid);
