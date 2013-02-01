require('server/util/globals')

waitFor = require('std/waitFor')

check = function check(err) {
	if (!err) { return }
	console.log("ERROR", err)
	throw err
}

module.exports = {
	makeDatabase:makeDatabase,
	makeS3:makeS3
}

function makeS3(s3conf) {
	return require('aws2js').load('s3', s3conf.accessKeyId, s3conf.accessKeySecret)
}

function makeDatabase(dbConf) {
	var Database = require('server/Database')
	return new Database(dbConf)
}