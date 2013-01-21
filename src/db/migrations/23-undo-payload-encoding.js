var util = require('./util')
var config = require('server/config/prod/prodConfig')
var db = util.makeDatabase(config.db)
var Messages = require('data/Messages')

fixMessages(function() {
	console.log("DONE")
})

function fixMessages(callback) {
	db.select(this, 'SELECT id, type, payloadJson FROM message', [], function(err, messages) {
		serialMap(messages, {
			iterate:function(message, next) {
				console.log('process', message.id)
				if (message.type == 1) {
					var payload = Messages.payload.decode('text', JSON.parse(message.payloadJson))
					message.payloadJson = JSON.stringify(payload)
				} else if (message.type == 2) {
					var payload = Messages.payload.decode('picture', JSON.parse(message.payloadJson))
					message.payloadJson = JSON.stringify(payload)
				} else {
					throw new Error("Unknown type " + message.type)
				}
				db.updateOne(this, 'UPDATE message SET payloadJson=? WHERE id=?', [message.payloadJson, message.id], next)
			},
			finish:function(err) {
				if (err) { throw err }
				callback()
			}
		})
	})
}