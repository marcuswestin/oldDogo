-- CREATE TABLE personEmail (
-- 	personId BIGINT UNSIGNED NOT NULL,
-- 	emailAddress VARCHAR(255) NOT NULL,
-- 	createdTime INT UNSIGNED NOT NULL,
-- 	PRIMARY KEY (emailAddress),
-- 	KEY keyPersonId (personId)
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE addressLookup (
	type TINYINT UNSIGNED NOT NULL,
	address VARCHAR(255) NOT NULL,
	personId BIGINT UNSIGNED DEFAULT NULL,
	name VARCHAR(255) NOT NULL,
	conversationIdsJson VARCHAR(1024) DEFAULT NULL,
	createdTime INT UNSIGNED NOT NULL,
	claimedTime INT UNSIGNED DEFAULT NULL,
	PRIMARY KEY (type, address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- CREATE TABLE personPhone (
-- 	personId BIGINT UNSIGNED NOT NULL,
-- 	countryCode VARCHAR(3) CHARACTER SET latin1 NOT NULL,
-- 	phoneNumber VARCHAR(12) CHARACTER SET latin1 NOT NULL,
-- 	createdTime INT UNSIGNED NOT NULL,
-- 	PRIMARY KEY (countryCode, phoneNumber)
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
