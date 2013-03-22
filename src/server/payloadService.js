var aws2js = require('aws2js')

var log = makeLog('payloadService')

module.exports = {
	configure:configure,
	makeRedirect:makeRedirect,
	uploadPayload:uploadPayload,
	uploadPersonPicture:uploadPersonPicture
}

var disabled = false
function disable() { disabled = true }

var s3 = null
var s3PersmissionAcl = 'public-read'
function configure(awsConf) {
	if (awsConf.s3.disable) { return disable() }
	s3 = aws2js.load('s3', awsConf.accessKeyId, awsConf.accessKeySecret)
	s3.setBucket(awsConf.s3.bucket)
}

var emptyBuffer = new Buffer(0)
function makeRedirect(fromPath, toUrl, callback) {
	log.debug('redirect from', fromPath, 'to', toUrl)
	var headers = { 'x-amz-website-redirect-location':toUrl }
	if (disabled) { log.debug('(disabled - skipping payload redirect)'); return callback() }
	s3.putBuffer(fromPath, emptyBuffer, s3PersmissionAcl, headers, callback)
}

function uploadPayload(conversationId, personIndex, type, payloadFile, callback) {
	makeUid(36, function(err, secret) {
		if (err) { return callback(err) }
		var path = Payloads.path(conversationId, personIndex, secret, type)
		_doUpload(type, path, payloadFile, function(err) { callback(err, secret) })
	})
}

function uploadPersonPicture(pictureFile, callback) {
	if (!pictureFile) { return callback('Missing picture') }
	makeUid(36, function(err, secret) {
		if (err) { return callback(err) }
		var path = Payloads.underlyingPersonPicturePath(secret)
		_doUpload('picture', path, pictureFile, function(err) { callback(err, secret) })
	})
}

function _doUpload(type, path, file, callback) {
	var uploadHeaders = { 'content-type':Payloads.mimeTypes[type], 'content-length':file.size }
	log.debug('uploading', file.path+' -> '+path, uploadHeaders)
	if (disabled) { log.debug('(disabled - skipping payload upload)'); return callback() }
	s3.putFile(path, file.path, s3PersmissionAcl, uploadHeaders, function(err, headers) {
		if (err) { log.error("Error uploading", path, err) }
		else { log.debug('uploaded', path) }
		callback(err)
	})
}
