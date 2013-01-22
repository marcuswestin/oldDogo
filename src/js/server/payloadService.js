var aws2js = require('aws2js')
var knox = require('knox')
var uuid = require('uuid')
var payloads = require('data/payloads')
var log = makeLog('payloadService')

module.exports = {
	configure:configure,
	upload:upload
}

var s3 = null
var s3Permission = 'public-read'
var s3Region = 'us-east-1' //'us-west-1'
function configure(s3conf) {
	payloads.bucket = s3conf.bucket
	s3 = aws2js.load('s3', s3conf.accessKeyId, s3conf.secretAccessKey)
	s3.setBucket(s3conf.bucket)
}

function upload(personId, conversationId, type, dataFile, callback) {
	var secret = uuid.v4()
	var path = payloads.path(conversationId, secret, type)
	var uploadHeaders = { 'content-type':payloads.mimeTypes[type], 'content-length':dataFile.size }
	log.info('uploading', dataFile.path+' -> '+path, uploadHeaders)
	s3.putFile(path, dataFile.path, s3Permission, uploadHeaders, function(err, headers) {
		if (err) {
			log.error("Uploading", contentType, path, err)
		}
		callback(err ? err : null, err ? null : secret)
	})
}

function _getSignedUrl(bucket, filename) {
	var knoxClient = knox.createClient({
		key:accessKeyId,
		bucket:bucket,
		secret:secretAccessKey
	})
	knoxClient.endpoint = knoxClient.endpoint.replace(/^s3\./, 's3-'+s3Region+'.')
	var expires = new Date()
	expires.setMinutes(expires.getMinutes() + 30)
	var url = knoxClient.signedUrl(filename, expires)
	// return url
	return url.replace(/\?.*/, '')
}
