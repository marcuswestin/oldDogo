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
	lastClientUidBlockStart BIGINT UNSIGNED NOT NULL DEFAULT 1,
	lastClientUidBlockEnd BIGINT UNSIGNED NOT NULL DEFAULT 100000,
	pushJson VARCHAR(1024) DEFAULT NULL,
	-- times
	joinedTime INT UNSIGNED NOT NULL,
	disabledTime INT UNSIGNED DEFAULT NULL,
	PRIMARY KEY (personId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE address (
	personId BIGINT UNSIGNED NOT NULL,
	addressType TINYINT UNSIGNED NOT NULL,
	addressId VARCHAR(255) NOT NULL,
	name VARCHAR (255) DEFAULT NULL,
	createdTime INT UNSIGNED NOT NULL,
	verifiedTime INT UNSIGNED DEFAULT NULL,
	PRIMARY KEY (personId, addressType, addressId),
	CONSTRAINT addressPerson FOREIGN KEY (personId) REFERENCES person(personId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE contact (
	personId BIGINT UNSIGNED NOT NULL,
	contactUid BIGINT UNSIGNED NOT NULL,
	addressType TINYINT UNSIGNED NOT NULL,
	addressId VARCHAR(255) NOT NULL,
	name VARCHAR(255) DEFAULT NULL,
	createdTime INT UNSIGNED NOT NULL,
	pictureUploadedTime INT UNSIGNED DEFAULT NULL,
	-- UNIQUE KEY addressKey (personId, addressId, addressType), -- For development only
	PRIMARY KEY (personId, contactUid),
	CONSTRAINT contactPerson FOREIGN KEY (personId) REFERENCES person(personId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE participation (
	participationId BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	personId BIGINT UNSIGNED NOT NULL,
	contactUid BIGINT UNSIGNED NOT NULL,
	conversationId BIGINT UNSIGNED NOT NULL,
	lastMessageTime INT UNSIGNED DEFAULT NULL,
	lastReceivedTime INT UNSIGNED DEFAULT NULL,
	lastReadTime INT UNSIGNED DEFAULT NULL,
	peopleJson VARCHAR(2048) NOT NULL,
	recentJson VARCHAR(2048) DEFAULT NULL,
	picturesJson VARCHAR(2048) DEFAULT NULL,
	PRIMARY KEY participationIdKey (participationId),
	CONSTRAINT participationContact FOREIGN KEY (personId, contactUid) REFERENCES contact(personId, contactUid),
	CONSTRAINT participationPerson FOREIGN KEY (personId) REFERENCES person(personId),
	UNIQUE KEY conversationIdKey (personId, conversationId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
