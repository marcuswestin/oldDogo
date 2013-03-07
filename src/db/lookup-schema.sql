CREATE TABLE addressLookup (
	addressType TINYINT UNSIGNED NOT NULL,
	addressId VARCHAR(255) NOT NULL,
	personId BIGINT UNSIGNED DEFAULT NULL,
	name VARCHAR(255) NOT NULL,
	conversationIdsJson VARCHAR(1024) DEFAULT NULL,
	createdTime INT UNSIGNED NOT NULL,
	claimedTime INT UNSIGNED DEFAULT NULL,
	PRIMARY KEY keyPrimary (addressType, addressId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE addressVerification (
	verificationId BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	verificationToken VARCHAR(36) NOT NULL,
	addressType TINYINT UNSIGNED NOT NULL,
	addressId VARCHAR(255) NOT NULL,
	name VARCHAR(255) NOT NULL,
	passwordHash VARCHAR(60) NOT NULL,
	pictureSecret VARCHAR(255) NOT NULL,
	pictureRegion TINYINT UNSIGNED DEFAULT 1, -- s3 region. Using just one for now
	createdTime INT UNSIGNED NOT NULL,
	usedTime INT UNSIGNED DEFAULT NULL,
	PRIMARY KEY keyPrimar (verificationId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
