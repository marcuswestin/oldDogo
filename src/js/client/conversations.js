var parallel = require('std/parallel')

module.exports = {
	fetch:fetchConversations,
	addAddresses:addAddresses,
	load:loadConversations
}

var fetchingQueue = null

function fetchConversations(callback) {
	if (fetchingQueue) {
		fetchingQueue.push(callback)
	} else {
		fetchingQueue = [callback]
		api.get('api/conversations', function getConversations(err, res) {
			var callbacks = fetchingQueue
			fetchingQueue = null
			var conversations = err ? null : res.conversations
			if (conversations) { gState.set('conversations', conversations) }
			each(callbacks, function(callback) { callback(err, conversations) })
		})
	}
}

function loadConversations(callback) {
	if (fetchingQueue) {
		fetchingQueue.push(callback)
	} else {
		gState.load('conversations', function(conversations) {
			callback(null, conversations)
		})
	}
}

function addAddresses(newAddresses, callback) {
	if (newAddresses.length == 0) { return callback() }
	parallel(_postAddresses, loadConversations, function(err, newConversations, oldConversations) {
		if (err) { return callback(err) }
		gState.set('conversations', (oldConversations || []).concat(newConversations))
		callback()
	})
	
	function _postAddresses(proceed) {
		api.post('api/addresses', { newAddresses:newAddresses }, function(err, res) {
			if (err) { return proceed(err) }
			callback(null, res.newConversations)
		})
	}
}
