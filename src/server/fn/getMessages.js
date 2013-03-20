module.exports = getMessages

getMessages.forConversation = getMessagesForConversation

function getMessages(personId, participationId, conversationId, afterMessageId, callback) {
	log.debug('get messages', personId, participationId, conversationId)
	parallel(_checkPermission, _getMessages, function(err, _, messages) {
		callback(err, { messages:messages })
	})
	
	function _checkPermission(callback) {
		var sql = 'SELECT conversationId FROM participation WHERE personId=? AND participationId=? AND conversationId=?'
		db.person(participationId).selectOne(sql, [personId, participationId, conversationId], function(err, res) {
			if (err) { return callback(err) }
			if (!res) { return callback('Unknown conversation') }
			callback(null, null)
		})
	}
	
	function _getMessages(callback) {
		getMessagesForConversation(conversationId, afterMessageId, function(err, messages) {
			if (err) { return callback(err) }
			callback(null, messages)
			_updateParticipationLastRead(messages[messages.length - 1])
		})
	}
	
	function _updateParticipationLastRead(lastMessage) {
		if (!lastMessage) { return }
		var sql = 'UPDATE participation SET lastReadTime=? WHERE personId=? AND participationId=?'
		db.person(participationId).updateOne(sql, [time.now(), personId, participationId], function(err) {
			if (err) { log.error('Could not update participation lastReadTime', personId, participationId, conversationId, err) }
		})
	}
}

function getMessagesForConversation(conversationId, afterMessageId, callback) {
	log.debug('select messages', conversationId)
	var sql = 'SELECT messageId, personIndex, clientUid, personId, personIndex, conversationId, type, postedTime, payloadJson FROM message WHERE conversationId=? AND messageId>? ORDER BY messageId'
	db.conversation(conversationId).select(sql, [conversationId, afterMessageId || 0], callback)
}
