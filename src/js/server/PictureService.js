var aws2js = require('aws2js')
var knox = require('knox')
var uuid = require('uuid')
var pictures = require('data/pictures')
var log = makeLog('PictureService')

module.exports = {
	configure:configure,
	upload:upload
}

var s3 = null
var s3Permission = 'public-read'
var s3Region = 'us-east-1' //'us-west-1'
function configure(s3conf) {
	pictures.bucket = s3conf.bucket
	s3 = aws2js.load('s3', s3conf.accessKeyId, s3conf.secretAccessKey)
	s3.setBucket(s3conf.bucket)
}

function upload(personId, conversationId, dataFile, callback) {
	var pictureSecret = uuid.v4()
	var path = pictures.path(conversationId, pictureSecret)
	var headers = { 'content-type':'image/jpg' }
	s3.putFile(path, dataFile.path, s3Permission, headers, function(err, headers) {
		log('Upload picture', path, err ? err : 'DONE')
		callback(err ? err : null, err ? null : pictureSecret)
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
