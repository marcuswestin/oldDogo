set foreign_key_checks = 0;

CREATE TABLE picture (
	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	created_by_account_id BIGINT UNSIGNED DEFAULT NULL,
	created_time INT UNSIGNED,
	uploaded_time INT UNSIGNED,
	width SMALLINT UNSIGNED NOT NULL,
	height SMALLINT UNSIGNED NOT NULL,
	secret CHAR(36) NOT NULL,
	meta_json VARCHAR(1024) DEFAULT NULL,
	FOREIGN KEY (created_by_account_id) REFERENCES account(id),
	PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE account (
	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	facebook_id BIGINT UNSIGNED NOT NULL,
	last_client_uid_block_start BIGINT UNSIGNED NOT NULL DEFAULT 0,
	last_client_uid_block_end BIGINT UNSIGNED NOT NULL DEFAULT 100000,
	email VARCHAR(255) DEFAULT NULL,
	email_verified_time INT UNSIGNED DEFAULT NULL,
	timezone TINYINT SIGNED DEFAULT NULL,
	locale CHAR(5) DEFAULT NULL,
	full_name VARCHAR(255) NOT NULL,
	first_name VARCHAR(63) NOT NULL,
	last_name VARCHAR(63) NOT NULL,
	image_picture_id BIGINT UNSIGNED DEFAULT NULL,
	gender ENUM('male','female') DEFAULT NULL,
	push_token VARCHAR(255) DEFAULT NULL,
	push_system ENUM('ios','android') DEFAULT NULL,
	created_time INT UNSIGNED,
	claimed_time INT UNSIGNED,
	FOREIGN KEY (image_picture_id) REFERENCES picture(id),
	UNIQUE KEY index_facebook_id (facebook_id),
	PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE facebook_contact (
	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	account_id BIGINT UNSIGNED NOT NULL,
	contact_facebook_id BIGINT UNSIGNED NOT NULL,
	contact_facebook_name VARCHAR(255) NOT NULL,
	FOREIGN KEY (account_id) REFERENCES account(id),
	UNIQUE KEY index_link (account_id, contact_facebook_id),
	PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE conversation (
	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	account_1_id BIGINT UNSIGNED NOT NULL,
	account_2_id BIGINT UNSIGNED NOT NULL,
	created_time INT UNSIGNED,
	last_message_id BIGINT UNSIGNED DEFAULT NULL,
	secret CHAR(36) NOT NULL,
	FOREIGN KEY (last_message_id) REFERENCES message(id),
	FOREIGN KEY (account_1_id) REFERENCES account(id),
	FOREIGN KEY (account_2_id) REFERENCES account(id),
	UNIQUE KEY index_accounts (account_1_id, account_2_id),
	PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE conversation_participation (
	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	conversation_id BIGINT UNSIGNED NOT NULL,
	account_id BIGINT UNSIGNED NOT NULL,
	last_received_message_id BIGINT UNSIGNED DEFAULT NULL,
	last_read_message_id BIGINT UNSIGNED DEFAULT NULL,
	FOREIGN KEY (conversation_id) REFERENCES conversation(id),
	FOREIGN KEY (account_id) REFERENCES account(id),
	FOREIGN KEY (last_received_message_id) REFERENCES message(id),
	FOREIGN KEY (last_read_message_id) REFERENCES message(id),
	UNIQUE KEY index_account_conversation (account_id, conversation_id),
	PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE message (
	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	sender_account_id BIGINT UNSIGNED NOT NULL,
	conversation_id BIGINT UNSIGNED NOT NULL,
	body VARCHAR(1024) DEFAULT NULL,
	picture_id BIGINT UNSIGNED DEFAULT NULL,
	sent_time INT UNSIGNED,
	client_uid BIGINT UNSIGNED NOT NULL,
	UNIQUE KEY index_sender_account_id_client_uid_tmp (sender_account_id, client_uid),
	FOREIGN KEY (sender_account_id) REFERENCES account(id),
	PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE facebook_request (
	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	facebook_request_id BIGINT UNSIGNED NOT NULL,
	from_account_id BIGINT UNSIGNED NOT NULL,
	to_account_id BIGINT UNSIGNED NOT NULL,
	conversation_id BIGINT UNSIGNED NOT NULL,
	created_time INT UNSIGNED,
	response_time INT UNSIGNED,
	FOREIGN KEY (from_account_id) REFERENCES account(id),
	FOREIGN KEY (to_account_id) REFERENCES account(id),
	FOREIGN KEY (conversation_id) REFERENCES conversation(id),
	UNIQUE KEY index_facebook_request_id (facebook_request_id),
	PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

set foreign_key_checks = 1;
