var aws2js = require('aws2js')
var uuid = require('uuid')
var payloads = require('data/payloads')

var log = makeLog('payloadService')

module.exports = {
	configure:configure,
	makeRedirect:makeRedirect,
	upload:upload
}

var s3 = null
var s3PersmissionAcl = 'public-read'
function configure(awsConf) {
	s3 = aws2js.load('s3', awsConf.accessKeyId, awsConf.accessKeySecret)
	s3.setBucket(awsConf.s3.bucket)
	payloads.configure(awsConf.s3)
}

var emptyBuffer = new Buffer(0)
function makeRedirect(fromPath, toUrl, callback) {
	log.debug('redirect from', payloads.base()+fromPath, 'to', toUrl)
	var headers = { 'x-amz-website-redirect-location':toUrl }
	s3.putBuffer(fromPath, emptyBuffer, s3PersmissionAcl, headers, callback)
}

function upload(personId, type, dataFile, callback) {
	var secret = uuid.v4()
	var path = payloads.path(personId, secret, type)
	var uploadHeaders = { 'content-type':payloads.mimeTypes[type], 'content-length':dataFile.size }
	log.debug('uploading', dataFile.path+' -> '+path, uploadHeaders)
	s3.putFile(path, dataFile.path, s3PersmissionAcl, uploadHeaders, function(err, headers) {
		if (err) { log.error("Error uploading payload", path, err) }
		callback(err ? err : null, err ? null : secret)
	})
}
