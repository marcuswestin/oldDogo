var region = 'us-west-1'
var aws2js = require('aws2js')
var knox = require('knox')
var uuid = require('uuid')
var pictures = require('data/pictures')
var s3Permission = 'public-read'
var s3
var log = makeLog('PictureService')

function getSignedUrl(bucket, filename) {
	var knoxClient = knox.createClient({
		key:accessKeyId,
		bucket:bucket,
		secret:secretAccessKey
	})
	knoxClient.endpoint = knoxClient.endpoint.replace(/^s3\./, 's3-'+region+'.')
	var expires = new Date()
	expires.setMinutes(expires.getMinutes() + 30)
	var url = knoxClient.signedUrl(filename, expires)
	// return url
	return url.replace(/\?.*/, '')
}

module.exports = proto(null,
	function(database, s3conf) {
		this.db = database
		pictures.bucket = s3conf.bucket
		s3 = aws2js.load('s3', s3conf.accessKeyId, s3conf.secretAccessKey)
		s3.setBucket(s3conf.bucket)
	}, {
		upload: function(accountId, conversationId, base64Data, callback) {
			var buf = new Buffer(base64Data.replace(/^data:image\/\w+;base64,/, ""), 'base64')
			var size = buf.length
			var pictureSecret = uuid.v4()
			var path = pictures.path(conversationId, pictureSecret)
			var headers = { 'content-type':'image/jpg', 'content-length':buf.length }
			s3.putBuffer(path, buf, s3Permission, headers, bind(this, function(err, headers) {
				log('Upload picture', err ? 'ERROR' : 'DONE', err)
				if (!callback) { return }
				callback(err ? err : null, err ? null : pictureSecret)
			}))
		}
	}
)
