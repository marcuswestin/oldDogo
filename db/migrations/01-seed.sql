CREATE TABLE picture (
	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	created_by_account_id BIGINT UNSIGNED DEFAULT NULL,
	created_time INT UNSIGNED,
	FOREIGN KEY (created_by_account_id) REFERENCES account(id),
	PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE account (
	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	facebook_id BIGINT UNSIGNED NOT NULL,
	locale CHAR(5) DEFAULT NULL,
	full_name VARCHAR(255) NOT NULL,
	image_picture_id BIGINT UNSIGNED DEFAULT NULL,
	gender ENUM('male','female') DEFAULT NULL,
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
	last_read_time INT UNSIGNED,
	FOREIGN KEY (conversation_id) REFERENCES conversation(id),
	FOREIGN KEY (account_id) REFERENCES account(id),
	PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE message (
	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	sender_account_id BIGINT UNSIGNED NOT NULL,
	conversation_id BIGINT UNSIGNED NOT NULL,
	body VARCHAR(255) DEFAULT NULL,
	payload_type ENUM('picture', 'sound') DEFAULT NULL,
	payload_id BIGINT UNSIGNED DEFAULT NULL,
	sent_time INT UNSIGNED,
	FOREIGN KEY (sender_account_id) REFERENCES account(id),
	PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
