CREATE TABLE person (
	-- personal info
	personId BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	locale CHAR(5) DEFAULT NULL,
	name VARCHAR(255) DEFAULT NULL,
	birthdate DATE DEFAULT NULL,
	gender ENUM('male','female') DEFAULT NULL,
	-- addresses
	facebookId BIGINT UNSIGNED DEFAULT NULL, -- REMOVE
	phoneNumbersJson VARCHAR(1024) DEFAULT NULL, -- REMOVE
	emailAddressesJson VARCHAR(1024) DEFAULT NULL, -- REMOVE
	-- utility data
	passwordHash VARCHAR(255) NOT NULL,
	lastClientUidBlockStart BIGINT UNSIGNED NOT NULL DEFAULT 0,
	lastClientUidBlockEnd BIGINT UNSIGNED NOT NULL DEFAULT 100000,
	pushJson VARCHAR(1024) DEFAULT NULL,
	-- times
	joinedTime INT UNSIGNED NOT NULL,
	disabledTime INT UNSIGNED DEFAULT NULL,
	PRIMARY KEY keyPrimary (personId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE address (
	personId BIGINT UNSIGNED NOT NULL,
	addressType TINYINT UNSIGNED NOT NULL,
	addressId VARCHAR(255) NOT NULL,
	name VARCHAR (255) DEFAULT NULL,
	createdTime INT UNSIGNED NOT NULL,
	verifiedTime INT UNSIGNED DEFAULT NULL,
	pictureUploadedTime INT UNSIGNED DEFAULT NULL,
	FOREIGN KEY personIdKey (personId) REFERENCES person(personId),
	PRIMARY KEY primaryKey (personId, addressType, addressId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE contact (
	personId BIGINT UNSIGNED NOT NULL,
	contactId BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	addressType TINYINT UNSIGNED NOT NULL,
	addressId VARCHAR(255) NOT NULL,
	name VARCHAR(255) DEFAULT NULL,
	createdTime INT UNSIGNED NOT NULL,
	UNIQUE KEY uniqueAddressKey (personId, addressId, addressType), -- Remove this
	PRIMARY KEY primaryKey (contactId),
	FOREIGN KEY personIdKey (personId) REFERENCES person(personId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE participation (
	personId BIGINT UNSIGNED NOT NULL,
	participationId BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	conversationId BIGINT UNSIGNED DEFAULT NULL,
	lastMessageTime INT UNSIGNED DEFAULT NULL,
	lastReceivedTime INT UNSIGNED DEFAULT NULL,
	lastReadTime INT UNSIGNED DEFAULT NULL,
	peopleJson VARCHAR(2048) NOT NULL,
	recentJson VARCHAR(2048) DEFAULT NULL,
	picturesJson VARCHAR(2048) DEFAULT NULL,
	PRIMARY KEY primaryKey (participationId),
	UNIQUE KEY personIdConversationIdKey (personId, conversationId),
	FOREIGN KEY personIdKey (personId) REFERENCES person(personId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
