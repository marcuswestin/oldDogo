module.exports = {
	refresh:refresh,
	load:load
}

var waiting = null
function refresh(callback) {
	if (waiting) {
		waiting.push(callback)
	} else {
		waiting = [callback]
		api.get('conversations', function getConversations(err, res) {
			var callbacks = waiting
			waiting = null
			var conversations = err ? null : res.conversations
			if (conversations) { gState.set('conversations', conversations) }
			each(callbacks, function(callback) { callback(err, conversations) })
		})
	}
}

function load(callback) {
	gState.load('conversations', callback)
}
