/*

create a new, final bucket
for each picture
	give uuid in DB
	deduce current URL
	download picture
	upload picture to new URL with conversation/id/picture/UUID.png
deploy server code with new image URLs

LATER
	remove old buckets

Mikey:
	Picture format. Png/Jpg. Where to convert? What compression details? Different per client? How to batch?
	S3 - zones, availability
	loading pictures - anything fancy like pipelining, keeping DNS connections open, etc?
	display pictures: any tricks there? prefetching?

*/

require('server/util/globals')
var Database = require('server/Database')
var PictureService = require('server/PictureService')
var config = require('server/config/dev/devConfig')
var request = require('request')
var accessKeyId = 'AKIAJDUJ4DPW4DE7552Q'
var secretAccessKey = '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'
var s3 = require('aws2js').load('s3', accessKeyId, secretAccessKey)
var region = 'us-west-1'
s3.setBucket(config.s3.bucket)

var database = new Database(config.db)
var pics = new PictureService(database, config.s3)

// s3.createBucket(config.s3.bucket, 'public-read', region, function(err, res) {
// 	if (err) { throw err }
// 	console.log("created bucket", res)
// })

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
		var oldUrl = pics.getImageUrl(null, r.conversationId, r.pictureId)
		var newPath = pics.getPicturePath(r.conversationId, r.pictureSecret)
		var newUrl = pics.getPictureUrl(null, r.conversationId, r.pictureId, r.pictureSecret)
		console.log('fetch image', oldUrl)
		request({ url:oldUrl, encoding:null }, function(err, res, body) {
			if (err) { throw err }
			console.log("Uploading image with size", body.length, newPath)
			s3.putBuffer(newPath, body, 'public-read', { 'content-type':'image/png' }, function(err, resHeaders) {
				console.log('Upload picture DONE:', err, resHeaders, newUrl)
				if (err) { throw err }
				next()
			})
		})
	}
	next()
})
