var region = 'us-west-1'
var aws2js = require('aws2js')
var knox = require('knox')
var uuid = require('uuid')
var pictures = require('../data/pictures')
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
		upload: function(accountId, conversationId, base64Data, pictureWidth, pictureHeight, callback) {
			this._insertPicture(this.db, accountId, pictureWidth, pictureHeight, function(err, pictureId, pictureSecret) {
				if (err) { return callback(err) }
				var buf = new Buffer(base64Data.replace(/^data:image\/\w+;base64,/, ""), 'base64')
				var size = buf.length
				var path = pictures.path(conversationId, pictureSecret)
				log('Uploading picture', pictureId, pictures.rawUrl(conversationId, pictureSecret))
				s3.putBuffer(path, buf, s3Permission, getHeaders(buf.length), bind(this, function(err, headers) {
					log('Upload picture DONE', pictureId, err)
					if (err && callback) {
						callback(err)
						callback = null
						return
					}
					var meta = { sizes:[] }
					this._updatePictureSent(this.db, pictureId, meta, function(err) {
						if (err) { return callback(err) }
						callback(null, pictureId)
					})
				}))
			})
		},
		
		// uploadThumb: function(buf, conversationId, pictureSecret, callback) {
		// 	var thumbPath = pictures.path(conversationId, pictureSecret, pictures.pixels.thumb)
		// 	var customArgs = [
		// 		"-gravity", "center",
		// 		"-extent", thumbSize+"x"+thumbSize
		// 	]
		// 	
		// 	imagemagick.resize({
		// 		srcData : buf,
		// 		strip : false,
		// 		width : thumbSize,
		// 		height : thumbSize+"^",
		// 		customArgs: customArgs
		// 	}, function(err, stdout, stderr) {
		// 		if (err) { return proceed(err) }
		// 		log('Uploading thumbnail', pictures.url(conversationId, pictureSecret, thumbSize))
		// 		var thumbBuf = new Buffer(stdout, 'binary')
		// 		s3.putBuffer(thumbPath, thumbBuf, s3Permission, getHeaders(thumbBuf.length), function(err, resHeaders) {
		// 			log('Upload thumbnail DONE', err)
		// 			callback(err, null)
		// 		})
		// 	})
		// },
		
		_insertPicture: function(conn, accountId, pictureWidth, pictureHeight, callback) {
			var secret = uuid.v4()
			conn.insert(this,
				'INSERT INTO picture SET created_time=?, created_by_account_id=?, width=?, height=?, secret=?',
				[conn.time(), accountId, pictureWidth, pictureHeight, secret], function(err, pictureId) {
					callback.call(this, err, pictureId, secret)
				})
		},
		_updatePictureSent: function(conn, pictureId, meta, callback) {
			conn.updateOne(this,
				'UPDATE picture SET uploaded_time=?, meta_json=? WHERE id=?',
				[conn.time(), JSON.stringify(meta), pictureId], callback)
		}
	}
)

function getHeaders(length) {
	return { 'content-type':'image/jpg', 'content-length':length }
}
