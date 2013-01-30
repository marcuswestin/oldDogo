var util = require('./util')
var config = require('server/config/dev/devConfig')
var db = util.makeDatabase(config.db)
var Messages = require('data/Messages')

function check(err) {
	if (!err) { return }
	console.log("ERROR", err)
	throw err
}

selectMessages(function(messages) {
	updateMessages(messages, function() {
		console.log("All done!")
	})
})

function selectMessages(callback) {
	db.select(this, 'SELECT * FROM message', function(err, messages) {
		check(err)
		serialMap(messages, {
			iterate:function(message, next) {
				if (message.picture_id) {
					db.selectOne(this, 'SELECT * FROM picture WHERE id=?', [message.picture_id], function(err, picture) {
						check(err)
						message.picture = picture
						next()
					})
				} else {
					next()
				}
			},
			finish:function(err) {
				check(err)
				console.log("Select messages done!")
				callback(messages)
			}
		})
	})
}

function updateMessages(messages, callback) {
	console.log('Update', messages.length, 'messages')
	serialMap(messages, {
		iterate:function(message, next) {
			var type
			var payload
			if (message.picture) {
				type = Messages.types.picture
				payload = { secret:message.picture.secret, width:message.picture.width, height:message.picture.height }
			} else if (message.body) {
				type = Messages.types.text
				payload = { body:message.body }
			} else {
				throw new Error("Now message picture or body")
			}
			payload = Messages.payload.encode(type, payload)
			db.updateOne(this, 'UPDATE message SET type=?, payloadJson=? WHERE id=?', [type, JSON.stringify(payload), message.id], next)
		},
		finish:function(err) {
			check(err)
			callback(messages)
		}
	})
}
