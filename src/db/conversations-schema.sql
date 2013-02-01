CREATE TABLE conversation (
	conversationId BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	createdTime INT UNSIGNED NOT NULL,
	peopleJson VARCHAR(1024) NOT NULL,
	PRIMARY KEY (conversationId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE message (
	messageId BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	fromPersonId BIGINT UNSIGNED NOT NULL,
	conversationId BIGINT UNSIGNED NOT NULL,
	sentTime INT UNSIGNED NOT NULL,
	clientUid BIGINT UNSIGNED NOT NULL,
	type INT UNSIGNED NOT NULL,
	payloadJson VARCHAR(2048) NOT NULL,
	UNIQUE KEY keyPersonClientUid (fromPersonId, clientUid),
	FOREIGN KEY keyConversationId (conversationId) REFERENCES conversation(conversationId),
	PRIMARY KEY (messageId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
