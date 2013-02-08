var aws2js = require('aws2js')
var uuid = require('uuid')
var payloads = require('data/payloads')

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
	payloads.configure(awsConf.s3)
}

var emptyBuffer = new Buffer(0)
function makeRedirect(fromPath, toUrl, callback) {
	log.debug('redirect from', payloads.base()+fromPath, 'to', toUrl)
	var headers = { 'x-amz-website-redirect-location':toUrl }
	if (disabled) { log.debug('(disabled - skipping payload redirect)'); return callback() }
	s3.putBuffer(fromPath, emptyBuffer, s3PersmissionAcl, headers, callback)
}

function uploadPayload(personId, type, payloadFile, callback) {
	var secret = uuid.v4()
	var path = payloads.path(personId, secret, type)
	_doUpload(type, path, payloadFile, function(err) { callback(err, secret) })
}

function uploadPersonPicture(pictureFile, callback) {
	var secret = uuid.v4()
	var path = payloads.underlyingPersonPicturePath(secret)
	_doUpload('picture', path, pictureFile, function(err) { callback(err, secret)})
}

function _doUpload(type, path, file, callback) {
	var uploadHeaders = { 'content-type':payloads.mimeTypes[type], 'content-length':file.size }
	log.debug('uploading', file.path+' -> '+path, uploadHeaders)
	if (disabled) { log.debug('(disabled - skipping payload upload)'); return callback() }
	s3.putFile(path, file.path, s3PersmissionAcl, uploadHeaders, function(err, headers) {
		if (err) { log.error("Error uploading", path, err) }
		callback(err)
	})
}
