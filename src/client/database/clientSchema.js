module.exports = {
	getTableSchemas:getTableSchemas,
	version:1
}

function getTableSchemas() {
	return [
		'CREATE TABLE IF NOT EXISTS contact (' + [
			'addressType TINYINT UNSIGNED NOT NULL',
			'addressId VARCHAR(255) NOT NULL',
			'contactUid BIGINT UNSIGNED NOT NULL',
			'name VARCHAR(255) DEFAULT NULL',
			'createdTime INT UNSIGNED NOT NULL',
			'localId VARCHAR(255) DEFAULT NULL',
			'hasLocalImage BOOL DEFAULT NULL',
			'pictureUploadedTime INT UNSIGNED DEFAULT NULL',
			'conversationId BIGINT UNSIGNED DEFAULT NULL',
			'PRIMARY KEY (contactUid)',
			'UNIQUE (addressType, addressId)',
		].join(',\n') + '); \n'
		,
		'CREATE TABLE IF NOT EXISTS message (' + [
			'messageId BIGINT UNSIGNED DEFAULT NULL',
			'personId BIGINT UNSIGNED DEFAULT NULL',
			'clientUid BIGINT UNSIGNED DEFAULT NULL',
			'personIndex TINYINT UNSIGNED NOT NULL',
			'conversationId BIGINT UNSIGNED NOT NULL',
			'postedTime INT UNSIGNED NOT NULL',
			'type INT UNSIGNED NOT NULL',
			'payloadJson VARCHAR(2048) NOT NULL',
			'PRIMARY KEY (personIndex, clientUid)',
			'UNIQUE (messageId)'
		].join(',\n') + '); \n'
		,
		'CREATE INDEX messageConversationIndex ON message(conversationId); \n'
	]
}
