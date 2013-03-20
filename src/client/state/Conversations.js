var parallel = require('std/parallel')

var cacheName = 'ConversationsMeta'

module.exports = {
	read:readConversations,
	fetch:fetchConversations,
	create:createConversation,
	readMessages:readMessages,
	fetchMessages:fetchMessages,
	addAddresses:addAddresses
}

function createConversation(contacts, callback) {
	api.post('api/conversation', { contacts:contacts }, function(err, res) {
		if (err) { return callback(err) }
		var conversation = _fixConversation(res.conversation)
		asyncEach(contacts, {
			iterate:function(contact, callback) {
				var sql = 'UPDATE contact SET conversationId=? WHERE contactUid=?'
				bridge.command('BTSql.update', { sql:sql, arguments:[conversation.conversationId, contact.contactUid] }, callback)
			},
			finish:function(err) {
				callback(err, conversation)
			}
		})
	})
}

function readConversations(callback) {
	Caches.read(cacheName, function(err, data) {
		if (err) { return callback(err) }
		var conversations = (data && data.conversations) || []
		callback(null, conversations)
	})
}

function _fixConversation(convo) {
	convo.people = jsonList(remove(convo, 'peopleJson'))
	convo.recent = jsonList(remove(convo, 'recentJson'))
	convo.pictures = jsonList(remove(convo, 'picturesJson'))
	return convo
}

function fetchConversations(callback) {
	api.get('api/conversations', function apiGetConversations(err, res) {
		if (err) { return callback(err) }
		var conversations = res.conversations
		each(conversations, _fixConversation)
		if (conversations.length) {
			Caches.write(cacheName, { conversations:conversations })
		}
		callback(null, conversations)
	})
}

function readMessages(conversation, callback) {
	var sql = 'SELECT * FROM message WHERE conversationId = ?'
	bridge.command('BTSql.query', { sql:sql, arguments:[conversation.conversationId] }, function(err, res) {
		if (err) { return callback(err) }
		each(res.rows, _decodeMessage)
		callback(null, res.rows)
	})
}

function _decodeMessage(messageRow) {
	messageRow.payload = JSON.parse(remove(messageRow, 'payloadJson'))
}

SQL = {
	insert:function(table, obj) {
		var props = Object.keys(obj).join(', ')
		var questionMarks = map(obj, function() { return '?' }).join(',')
		return 'INSERT INTO '+table+' ('+props+') VALUES ('+questionMarks+')'
	},
	arguments:function(obj) {
		return map(obj, function(val) { return val })
	}
}

function fetchMessages(conversation, callback) {
	Documents.get(cacheName+'-'+conversation.conversationId, 'lastMessageId', function(err, lastMessageId) {
		if (err) { return callback(err) }
		var params = { conversationId:conversation.conversationId, participationId:conversation.participationId, sinceMessageId:lastMessageId }
		api.get('api/messages', params, function(err, res) {
			if (err) { return callback(err) }
			asyncEach(res.messages, {
				parallel:Math.min(res.messages.length, 4),
				iterate:function(message, callback) {
					var sql = SQL.insert('message', message)
					var arguments = SQL.arguments(message)
					bridge.command('BTSql.update', { sql:sql, arguments:arguments, ignoreDuplicates:true }, function(err) {
						if (err) { return callback(err) }
						_decodeMessage(message)
						callback()
					})
				},
				finish:function(err) {
					if (err) { return callback(err) }
					var lastMessage = last(res.messages)
					if (lastMessage) {
						Documents.set(cacheName+'-'+conversation.conversationId, { lastMessageId:lastMessage.messageId }, function(err) {
							if (err) { return callback(err) }
							callback(null, res.messages)
						})
					} else {
						callback(null, res.messages)
					}
				}
			})
		})
	})
}

function addAddresses(newAddresses, callback) {
	if (newAddresses.length == 0) { return callback() }
	
	parallel(_postNewAddresses, readConversations, function(err, newConversations, localConversations) {
		if (err) { return callback(err) }
		var allConversations = localConversations.concat(newConversations)
		Caches.write(cacheName, { conversations:allConversations })
		callback()
		events.fire('conversations.new', { newConversations:newConversations })
	})
	
	function _postNewAddresses(callback) {
		api.post('api/addresses', { newAddresses:newAddresses }, function(err, res) {
			if (err) { return callback(err) }
			callback(null, res.newConversations)
		})
	}
}
