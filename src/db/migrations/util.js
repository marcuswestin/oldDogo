require('server/util/globals')

module.exports = {
	makeDatabase:makeDatabase,
	makeS3:makeS3
}

function makeS3(s3conf) {
	return require('aws2js').load('s3', s3conf.accessKeyId, s3conf.secretAccessKey)
}

function makeDatabase(dbConf) {
	var Database = require('server/Database')
	return new Database(dbConf)
}