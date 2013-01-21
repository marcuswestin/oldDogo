CREATE TABLE personEmail (
	personId BIGINT UNSIGNED NOT NULL,
	emailAddress VARCHAR(255) NOT NULL,
	createdTime INT UNSIGNED NOT NULL,
	PRIMARY KEY (emailAddress),
	KEY keyPersonId (personId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE personFacebook (
	personId BIGINT UNSIGNED NOT NULL,
	facebookId BIGINT UNSIGNED NOT NULL,
	createdTime INT UNSIGNED NOT NULL,
	PRIMARY KEY (facebookId),
	UNIQUE KEY keyPersonId (personId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- CREATE TABLE personPhone (
-- 	personId BIGINT UNSIGNED NOT NULL,
-- 	countryCode VARCHAR(3) CHARACTER SET latin1 NOT NULL,
-- 	phoneNumber VARCHAR(12) CHARACTER SET latin1 NOT NULL,
-- 	createdTime INT UNSIGNED NOT NULL,
-- 	PRIMARY KEY (countryCode, phoneNumber)
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
