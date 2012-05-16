var accessKeyId = 'AKIAJDUJ4DPW4DE7552Q'
var secretAccessKey = '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'
var region = 'us-west-1'
var s3 = require('aws2js').load('s3', accessKeyId, secretAccessKey)
var knox = require('knox')

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
	function(database) {
		this.db = database
	}, {
		upload: function(accountId, conversation, base64PictureData, callback) {
			this._withConversationBucket(conversation, function(err, bucket) {
				if (err) { return callback(err) }
				this._insertPicture(this.db, accountId, function(err, pictureId) {
					if (err) { return callback(err) }
					var buf = new Buffer(base64PictureData.replace(/^data:image\/\w+;base64,/, ""), 'base64')
					var path = this._getPicturePath(pictureId)
					console.log('Uploading picture:', pictureId)
					s3.setBucket(bucket)
					s3.putBuffer(path, buf, 'public-read', { 'content-type':'image/png' }, bind(this, function(err, resHeaders) {
						console.log('Upload picture DONE:', pictureId, err, resHeaders)
						if (err) { return callback(err) }
						this._updatePictureSent(this.db, pictureId, function(err) {
							if (err) { return callback(err) }
							callback(null, pictureId)
						})
					}))
				})
			})
		},
		
		getImageUrl: function(accountId, conversationId, pictureId) {
			return getSignedUrl(this._getConversationBucketName(conversationId), this._getPicturePath(pictureId))
		},
		
		_getConversationBucketName: function(conversationId) {
			return 'dogo-test6-conversation-'+conversationId
		},
		
		_getPicturePath: function(pictureId) {
			return 'pictures/'+pictureId+'.png'
		},
		
		_withConversationBucket:function(conversation, callback) {
			if (!conversation.id) { return callback('Conversation does not have an ID') }
			var bucket = this._getConversationBucketName(conversation.id)
			if (conversation.hasBucket) { return callback.call(this, null, bucket) }
			console.log('Creating bucket:', bucket)
			s3.createBucket(bucket, 'public-read', region, bind(this, function(err, res) {
				console.log('Created bucket DONE:', bucket, err, res)
				if (err) { return callback.call(this, err) }
				this._updateConversationHasBucket(this.db, conversation.id, function(err) {
					if (err) { return callback.call(this, err) }
					callback.call(this, null, bucket)
				})
			}))
		},
		
		_insertPicture: function(conn, accountId, callback) {
			conn.insert(this,
				'INSERT INTO picture SET created_time=?, created_by_account_id=?',
				[conn.time(), accountId], callback)
		},
		_updatePictureSent: function(conn, pictureId, callback) {
			conn.updateOne(this,
				'UPDATE picture SET uploaded_time=? WHERE id=?',
				[conn.time(), pictureId], callback)
		},
		_updateConversationHasBucket: function(conn, conversationId, callback) {
			conn.updateOne(this,
				'UPDATE conversation SET bucket_created_time=? WHERE id=?',
				[conn.time(), conversationId], callback)
		}
	}
)
