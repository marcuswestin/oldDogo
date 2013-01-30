require('server/util/globals')
var Database = require('server/Database')
var PictureService = require('server/PictureService')
var config = require('server/config/dev/devConfig')
var request = require('request')
var accessKeyId = 'AKIAJDUJ4DPW4DE7552Q'
var secretAccessKey = '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'
var s3 = require('aws2js').load('s3', accessKeyId, secretAccessKey)
var region = 'us-west-1'
var fs = require('fs')
var pictures = require('data/pictures')

var database = new Database(config.db)
var pics = new PictureService(database, config.s3)

console.log('select pictures')
database.select(this, "select COALESCE(p.meta_json, '{}') as metaJson, p.id as pictureId, m.id as messageId, c.id as conversationId, p.secret as pictureSecret FROM picture p INNER JOIN message m ON m.picture_id=p.id INNER JOIN conversation c ON m.conversation_id=c.id", function(err, res) {
	if (err) { throw err }
	console.log('selected', res.length, 'pictures')
	function next() {
		console.log("NEXT")
		if (!res.length) {
			console.log("ALL DONE WOOT")
			return
		}
		var r = res.pop()
		var meta = JSON.parse(r.metaJson)
		var url = pictures.rawUrl(r.conversationId, r.pictureSecret)
		if (meta.sizes && meta.sizes[0]) {
			console.log("Skipping", url)
			return next()
		}
		console.log("Fetch image", r.pictureId, url)
		request({ url:url, encoding:null }, function(err, res, body) {
			if (err) { throw err }
			console.log("Upload thumb", r.pictureId)
			pics.uploadThumb(body, r.conversationId, r.pictureSecret, pictures.pixels.thumb, function(err) {
				if (err) { throw err }
				var metadata = { sizes:[pictures.pixels.thumb] }
				console.log("Set metadata", r.pictureId)
				database.updateOne(this, 'UPDATE picture SET meta_json=? WHERE id=?', [JSON.stringify(metadata), r.pictureId], function(err) {
					if (err) { throw err }
					next()
				})
			})
		})
	}
	var parallel = 1
	while (parallel-- > 0) { next() }
})
