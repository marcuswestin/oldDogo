module.exports = {
	getSchema:getSchema,
	version:1
}

function getSchema() {
	return [
		'CREATE TABLE IF NOT EXISTS contact (',
			'addressType TINYINT UNSIGNED NOT NULL,',
			'addressId VARCHAR(255) NOT NULL,',
			'name VARCHAR(255) DEFAULT NULL,',
			'createdTime INT UNSIGNED NOT NULL,',
			'localId VARCHAR(255) DEFAULT NULL,',
			'hasLocalImage INT DEFAULT 0,',
			'pictureUploadedTime INT UNSIGNED DEFAULT NULL,',
	  		'PRIMARY KEY (addressType, addressId)',
		');'
	].join('\n')
}
