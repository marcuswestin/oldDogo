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
