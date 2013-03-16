CREATE TABLE conversation (
	conversationId BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	createdTime INT UNSIGNED NOT NULL,
	peopleJson VARCHAR(1024) NOT NULL,
	PRIMARY KEY (conversationId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE message (
	messageId BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	conversationId BIGINT UNSIGNED NOT NULL,
	-- either fromPersonId or fromGuestIndex must be specified
	fromPersonId BIGINT UNSIGNED DEFAULT NULL,
	fromGuestIndex SMALLINT UNSIGNED DEFAULT NULL,
	postedTime INT UNSIGNED NOT NULL,
	clientUid BIGINT UNSIGNED NOT NULL,
	type INT UNSIGNED NOT NULL,
	payloadJson VARCHAR(2048) NOT NULL,
	UNIQUE KEY clientUidKey (fromPersonId, clientUid),
	CONSTRAINT messageConversation FOREIGN KEY (conversationId) REFERENCES conversation(conversationId),
	PRIMARY KEY (messageId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

