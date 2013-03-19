CREATE TABLE conversation (
	conversationId BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	createdTime INT UNSIGNED NOT NULL,
	peopleJson VARCHAR(1024) NOT NULL,
	PRIMARY KEY (conversationId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE message (
	messageId BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	conversationId BIGINT UNSIGNED NOT NULL,
	-- either fromPersonId+clientUid or fromGuestIndex must be specified
	fromPersonId BIGINT UNSIGNED DEFAULT NULL,
	clientUid BIGINT UNSIGNED DEFAULT NULL,
	fromGuestIndex SMALLINT UNSIGNED DEFAULT NULL,
	postedTime INT UNSIGNED NOT NULL,
	type INT UNSIGNED NOT NULL,
	payloadJson VARCHAR(2048) NOT NULL,
	CONSTRAINT messageConversation FOREIGN KEY (conversationId) REFERENCES conversation(conversationId),
	PRIMARY KEY (messageId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE guestAccess (
	conversationId BIGINT UNSIGNED NOT NULL,
	secret VARCHAR(36) CHARACTER SET latin1 NOT NULL,
	createdTime INT UNSIGNED NOT NULL,
	guestIndex SMALLINT UNSIGNED NOT NULL,
	PRIMARY KEY (conversationId, guestIndex),
	CONSTRAINT guestAccessConversation FOREIGN KEY (conversationId) REFERENCES conversation(conversationId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
