set foreign_key_checks = 0;

CREATE TABLE person (
	personId BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	facebookId BIGINT UNSIGNED DEFAULT NULL,
	lastClientUidBlockStart BIGINT UNSIGNED NOT NULL DEFAULT 0,
	lastClientUidBlockEnd BIGINT UNSIGNED NOT NULL DEFAULT 100000,
	timezone TINYINT SIGNED DEFAULT NULL,
	locale CHAR(5) DEFAULT NULL,
	name VARCHAR(255) DEFAULT NULL,
	firstName VARCHAR(63) DEFAULT NULL,
	lastName VARCHAR(63) DEFAULT NULL,
	birthdate DATE DEFAULT NULL,
	gender ENUM('male','female') DEFAULT NULL,
	pushToken VARCHAR(255) DEFAULT NULL,
	pushSystem ENUM('ios','android') DEFAULT NULL,
	createdTime INT UNSIGNED NOT NULL,
	claimedTime INT UNSIGNED DEFAULT NULL,
	waitlistedTime INT UNSIGNED DEFAULT NULL,
	disabledTime INT UNSIGNED DEFAULT NULL,
	infoJson VARCHAR(1024) NOT NULL DEFAULT "{}",
	UNIQUE KEY keyFacebookId (facebookId),
	PRIMARY KEY (personId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE waitlistEvent (
	waitlistEventId BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	personId BIGINT UNSIGNED NOT NULL,
	userAgent VARCHAR(1024) DEFAULT NULL,
	PRIMARY KEY (waitlistEventId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE conversation (
	conversationId BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	person1Id BIGINT UNSIGNED NOT NULL, -- the people ids are for non-group chats only.
	person2Id BIGINT UNSIGNED NOT NULL, -- they represent and ensure uniqueness of relationships.
	createdTime INT UNSIGNED NOT NULL,
	participantsJson VARCHAR(1024) NOT NULL,
	UNIQUE KEY keyRelationship (person1Id, person2Id),
	UNIQUE KEY keyRelationshipReverse (person2Id, person1Id),
	PRIMARY KEY (conversationId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE conversationParticipation (
	participationId BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	conversationId BIGINT UNSIGNED NOT NULL,
	personId BIGINT UNSIGNED NOT NULL,
	lastMessageTime INT UNSIGNED DEFAULT NULL,
	lastReceivedTime INT UNSIGNED DEFAULT NULL,
	lastReadTime INT UNSIGNED DEFAULT NULL,
	summaryJson VARCHAR(8192) NOT NULL,
	PRIMARY KEY (participationId),
	UNIQUE KEY keyPersonIdConversationId (personId, conversationId),
	KEY keyConversationId (conversationId),
	FOREIGN KEY keyPersonId (personId) REFERENCES person(personId)
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

-- CREATE TABLE conversationParticipationSecret (
-- 	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
-- 	conversationParticipationId BIGINT UNSIGNED NOT NULL,
-- 	secret CHAR(36) NOT NULL,
-- 	createdTime INT UNSIGNED NOT NULL,
-- 	claimedTime INT UNSIGNED DEFAULT NULL,
-- 	PRIMARY KEY (id)
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
-- 
-- CREATE TABLE facebook_request (
-- 	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
-- 	facebookRequestId BIGINT UNSIGNED NOT NULL,
-- 	conversationSecretId BIGINT UNSIGNED NOT NULL,
-- 	UNIQUE KEY keyFacebookRequestId (facebookRequestId),
-- 	PRIMARY KEY (id)
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

set foreign_key_checks = 1;
