module.exports = {
	getSchema:getSchema,
	version:1
}

function getSchema() {
	return [
		'CREATE TABLE IF NOT EXISTS contact (',
			'addressType TINYINT UNSIGNED NOT NULL,',
			'addressId VARCHAR(255) NOT NULL,',
			'contactUid BIGINT UNSIGNED NOT NULL,',
			'name VARCHAR(255) DEFAULT NULL,',
			'createdTime INT UNSIGNED NOT NULL,',
			'localId VARCHAR(255) DEFAULT NULL,',
			'hasLocalImage BOOL DEFAULT NULL,',
			'pictureUploadedTime INT UNSIGNED DEFAULT NULL,',
			'PRIMARY KEY (contactUid),',
			'UNIQUE (addressType, addressId)',
		');'
	].join('\n')
}
