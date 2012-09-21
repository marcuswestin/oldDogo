CREATE TABLE account_email (
	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	account_id BIGINT UNSIGNED NOT NULL,
	email_address VARCHAR(255) NOT NULL,
	created_time INT UNSIGNED NOT NULL,
	claimed_time INT UNSIGNED NOT NULL,
	UNIQUE KEY index_email_address (email_address),
	FOREIGN KEY (account_id) REFERENCES account(id),
	PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
