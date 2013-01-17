set foreign_key_checks = 0;

CREATE TABLE account (
	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	facebook_id BIGINT UNSIGNED DEFAULT NULL,
	last_client_uid_block_start BIGINT UNSIGNED NOT NULL DEFAULT 0,
	last_client_uid_block_end BIGINT UNSIGNED NOT NULL DEFAULT 100000,
	timezone TINYINT SIGNED DEFAULT NULL,
	locale CHAR(5) DEFAULT NULL,
	full_name VARCHAR(255) DEFAULT NULL,
	first_name VARCHAR(63) DEFAULT NULL,
	last_name VARCHAR(63) DEFAULT NULL,
	gender ENUM('male','female') DEFAULT NULL,
	push_token VARCHAR(255) DEFAULT NULL,
	push_system ENUM('ios','android') DEFAULT NULL,
	created_time INT UNSIGNED NOT NULL,
	claimed_time INT UNSIGNED DEFAULT NULL,
	waitlisted_time INT UNSIGNED DEFAULT NULL,
	UNIQUE KEY index_facebook_id (facebook_id),
	PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE waitlist_event (
	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	account_id BIGINT UNSIGNED NOT NULL,
	user_agent VARCHAR(1024) DEFAULT NULL,
	FOREIGN KEY (account_id) REFERENCES account(id),
	PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE account_email (
	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	account_id BIGINT UNSIGNED NOT NULL,
	email_address VARCHAR(255) NOT NULL,
	created_time INT UNSIGNED NOT NULL,
	claimed_time INT UNSIGNED DEFAULT NULL,
	UNIQUE KEY index_email_address (email_address),
	FOREIGN KEY (account_id) REFERENCES account(id),
	PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- CREATE TABLE account_phone (
-- 	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
-- 	account_id BIGINT UNSIGNED NOT NULL,
-- 	country_code VARCHAR(3) CHARACTER SET latin1 NOT NULL,
-- 	phone_number VARCHAR(12) CHARACTER SET latin1 NOT NULL,
-- 	verified_time INT UNSIGNED DEFAULT NULL,
-- 	UNIQUE KEY index_phone_number (phone_number),
-- 	FOREIGN KEY (account_id) REFERENCES account(id),
-- 	PRIMARY KEY (id)
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE conversation (
	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	account_1_id BIGINT UNSIGNED NOT NULL, -- the account ids are for non-group chats only.
	account_2_id BIGINT UNSIGNED NOT NULL, -- they represent and ensure uniqueness of relationships.
	created_time INT UNSIGNED NOT NULL,
	FOREIGN KEY (account_1_id) REFERENCES account(id),
	FOREIGN KEY (account_2_id) REFERENCES account(id),
	UNIQUE KEY index_accounts (account_1_id, account_2_id),
	UNIQUE KEY index_accounts_reverse (account_2_id, account_1_id),
	PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE conversation_participation (
	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	conversation_id BIGINT UNSIGNED NOT NULL,
	account_id BIGINT UNSIGNED NOT NULL,
	lastMessageTime INT UNSIGNED DEFAULT NULL,
	lastReceivedTime INT UNSIGNED DEFAULT NULL,
	lastReadTime INT UNSIGNED DEFAULT NULL,
	summaryJson VARCHAR(8192) NOT NULL,
	FOREIGN KEY (conversation_id) REFERENCES conversation(id),
	FOREIGN KEY (account_id) REFERENCES account(id),
	UNIQUE KEY index_account_conversation (account_id, conversation_id),
	PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE message (
	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	sender_account_id BIGINT UNSIGNED NOT NULL,
	conversation_id BIGINT UNSIGNED NOT NULL,
	sent_time INT UNSIGNED NOT NULL,
	client_uid BIGINT UNSIGNED NOT NULL,
	type INT UNSIGNED NOT NULL,
	payloadJson VARCHAR(2048) NOT NULL,
	UNIQUE KEY index_sender_account_id_client_uid (sender_account_id, client_uid),
	FOREIGN KEY (sender_account_id) REFERENCES account(id),
	PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- CREATE TABLE conversation_participation_secret (
-- 	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
-- 	conversation_participation_id BIGINT UNSIGNED NOT NULL,
-- 	secret CHAR(36) NOT NULL,
-- 	created_time INT UNSIGNED NOT NULL,
-- 	claimed_time INT UNSIGNED DEFAULT NULL,
-- 	FOREIGN KEY (conversation_participation_id) REFERENCES conversation_participation(id),
-- 	PRIMARY KEY (id)
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
-- 
-- CREATE TABLE facebook_request (
-- 	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
-- 	facebook_request_id BIGINT UNSIGNED NOT NULL,
-- 	conversation_secret_id BIGINT UNSIGNED NOT NULL,
-- 	FOREIGN KEY (conversation_secret_id) REFERENCES conversation_secret(id),
-- 	UNIQUE KEY index_facebook_request_id (facebook_request_id),
-- 	PRIMARY KEY (id)
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

set foreign_key_checks = 1;
