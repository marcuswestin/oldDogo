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
			each(callbacks, function(callback) { callback && callback(err, conversations) })
		})
	}
}

function loadConversations(callback) {
	if (fetchingQueue) {
		fetchingQueue.push(callback)
	} else {
		gState.load('conversations', function(conversations) {
			callback(conversations)
		})
	}
}

function addAddresses(newAddresses, callback) {
	if (newAddresses.length == 0) { return callback(null, gState.cache['conversations']) }
	parallel(_postAddresses, _loadConversations, function(err, newConversations, oldConversations) {
		if (err) { return callback(err) }
		var allConversations = (oldConversations || []).concat(newConversations)
		gState.set('conversations', allConversations)
		callback && callback(null, allConversations)
		events.fire('conversations.new', { allConversations:allConversations })
	})
	
	function _postAddresses(callback) {
		api.post('api/addresses', { newAddresses:newAddresses }, function(err, res) {
			if (err) { return callback(err) }
			callback(null, res.newConversations)
		})
	}
	
	function _loadConversations(callback) {
		loadConversations(function(conversations) { callback(null, conversations) })
	}
}
