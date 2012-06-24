var accessKeyId = 'AKIAJDUJ4DPW4DE7552Q'
var secretAccessKey = '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'
var region = 'us-west-1'
var s3 = require('aws2js').load('s3', accessKeyId, secretAccessKey)
var knox = require('knox')
var uuid = require('uuid')

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
		this.bucket = s3conf.bucket
		s3.setBucket(this.bucket)
	}, {
		upload: function(accountId, conversation, base64PictureData, pictureWidth, pictureHeight, callback) {
				this._insertPicture(this.db, accountId, pictureWidth, pictureHeight, function(err, pictureId, pictureSecret) {
					if (err) { return callback(err) }
					var buf = new Buffer(base64PictureData.replace(/^data:image\/\w+;base64,/, ""), 'base64')
					var path = this.getPicturePath(conversation.id, pictureSecret)
					console.log('Uploading picture:', path)
					s3.putBuffer(path, buf, 'public-read', { 'content-type':'image/png' }, bind(this, function(err, resHeaders) {
						console.log('Upload picture DONE:', pictureId, err, resHeaders)
						if (err) { return callback(err) }
						this._updatePictureSent(this.db, pictureId, function(err) {
							if (err) { return callback(err) }
							callback(null, pictureId)
						})
					}))
				})
		},
		
		getPictureUrl: function(accountId, conversationId, pictureId, pictureSecret) {
			return 'http://'+this.bucket+'.s3.amazonaws.com/'+this.getPicturePath(conversationId, pictureSecret)
		},
		
		getPicturePath: function(conversationId, pictureSecret) {
			return 'conversation/'+conversationId+'/picture/'+pictureSecret+'.png'
		},
		
		_insertPicture: function(conn, accountId, pictureWidth, pictureHeight, callback) {
			var secret = uuid.v4()
			conn.insert(this,
				'INSERT INTO picture SET created_time=?, created_by_account_id=?, width=?, height=?, secret=?',
				[conn.time(), accountId, pictureWidth, pictureHeight, secret], function(err, pictureId) {
					callback.call(this, err, pictureId, secret)
				})
		},
		_updatePictureSent: function(conn, pictureId, callback) {
			conn.updateOne(this,
				'UPDATE picture SET uploaded_time=? WHERE id=?',
				[conn.time(), pictureId], callback)
		}
	}
)
