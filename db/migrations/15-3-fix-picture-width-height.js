// brew install cairo
// npm install canvas

require('../../src/server/util/globals')
var Database = require('../../src/server/Database')
var PictureService = require('../../src/server/PictureService')
var config = require('../../src/server/config/prod')
var request = require('request')
var accessKeyId = 'AKIAJDUJ4DPW4DE7552Q'
var secretAccessKey = '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'
var s3 = require('aws2js').load('s3', accessKeyId, secretAccessKey)
var region = 'us-west-1'
var Image = require('canvas').Image
var fs = require('fs')
s3.setBucket(config.s3.bucket)

var database = new Database(config.db)
var pics = new PictureService(database, config.s3)

console.log('select')
database.select(this, "select p.id as pictureId, m.id as messageId, c.id as conversationId, p.secret as pictureSecret FROM picture p INNER JOIN message m ON m.picture_id=p.id INNER JOIN conversation c ON m.conversation_id=c.id", function(err, res) {
	console.log('selected', res)
	function next() {
		if (!res.length) {
			console.log("ALL DONE WOOT")
			process.exit(0)
			return
		}
		var r = res.pop()
		pics.getPictureUrl(null, r.conversationId, r.pictureId, r.pictureSecret, function(err, url) {
			console.log('fetch image', url)
			request({ url:url.replace('.jpg', '.png'), encoding:null }, function(err, res, body) {
				if (err) { throw err }
				var img = new Image()
				img.src = body
				database.updateOne(this, "UPDATE picture SET width=?, height=? WHERE id=?", [img.width, img.height, r.pictureId], function(err, res) {
					if (err) { throw err }
					next()
				})
			})
		})
	}
	next()
})
