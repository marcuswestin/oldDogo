var parallel = require('std/parallel')

var cacheName = 'Conversations'

module.exports = {
	read:readConversations,
	fetch:fetchConversations,
	readMessages:readMessages,
	fetchMessages:fetchMessages,
	addAddresses:addAddresses
}

function readConversations(callback) {
	Caches.read(cacheName, function(err, data) {
		if (err) { return callback(err) }
		var conversations = (data && data.conversations) || []
		callback(null, conversations)
	})
}

function fetchConversations(callback) {
	api.get('api/conversations', function apiGetConversations(err, res) {
		if (err) { return callback(err) }
		var conversations = res.conversations
		if (conversations.length) {
			Caches.write(cacheName, { conversations:conversations })
		}
		callback(null, conversations)
	})
}

function readMessages(conversation, callback) {
	Caches.read(cacheName+'-'+conversation.conversationId, function(err, data) {
		if (err) { return callback(err) }
		var messages = (data && data.messages) || []
		callback(null, messages)
	})
}

function fetchMessages(conversation, callback) {
	api.get('api/messages', { conversationId:conversation.conversationId }, function(err, res) {
		if (err) { return callback(err) }
		var messages = res.messages
		if (messages.length) {
			Caches.write(cacheName+'-'+conversation.conversationId, { messages:messages })
		}
		callback(null, messages)
	})
}

function addAddresses(newAddresses, callback) {
	if (newAddresses.length == 0) { return callback() }
	
	parallel(_postNewAddresses, readConversations, function(err, newConversations, localConversations) {
		if (err) { return callback(err) }
		var allConversations = localConversations.concat(newConversations)
		Caches.write(cacheName, { conversations:allConversations })
		callback()
		events.fire('conversations.new', { allConversations:allConversations })
	})
	
	function _postNewAddresses(callback) {
		api.post('api/addresses', { newAddresses:newAddresses }, function(err, res) {
			if (err) { return callback(err) }
			callback(null, res.newConversations)
		})
	}
}
