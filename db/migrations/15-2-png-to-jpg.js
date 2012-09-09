// brew install imagemagick
// npm install imagemagick

require('../../src/server/util/globals')
var Database = require('../../src/server/Database')
var PictureService = require('../../src/server/PictureService')
var config = require('../../src/server/config/prod')
var request = require('request')
var accessKeyId = 'AKIAJDUJ4DPW4DE7552Q'
var secretAccessKey = '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'
var s3 = require('aws2js').load('s3', accessKeyId, secretAccessKey)
var region = 'us-west-1'
var im = require('imagemagick')
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
		var oldUrl = pics.getPictureUrl(null, r.conversationId, r.pictureId, r.pictureSecret)
		var newPath = pics.getPicturePathNew(r.conversationId, r.pictureSecret)
		console.log('fetch image', oldUrl)
		request({ url:oldUrl, encoding:null }, function(err, res, body) {
			if (err) { throw err }
			fs.writeFileSync('image.png', body, 'binary')
			im.convert(['image.png', 'image.jpg'], function(err) {
				if (err) { throw err }
				var newBody = fs.readFileSync('image.jpg')
				console.log("Uploading image with size from", body.length, "to", newBody.length, "path", newPath)
				s3.putBuffer(newPath, newBody, 'public-read', { 'content-type':'image/jpg' }, function(err, resHeaders) {
					console.log('Upload picture DONE:', err, resHeaders, newPath)
					if (err) { throw err }
					next()
				})
			})
		})
	}
	next()
})
