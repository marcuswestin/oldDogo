var trim = require('std/trim')
var Messages = require('data/Messages')
var pushService = require('server/PushService')
var parallel = require('std/parallel')
var log = makeLog('MessageService')

module.exports = {
	sendMessage: sendMessage,
	saveFacebookRequest: saveFacebookRequest,
	loadFacebookRequestId: loadFacebookRequestId
}

function sendMessage(session, messageData, payloadFile, prodPush, callback) {
	log.debug('sendMessage', session, messageData)
	
	var fromPersonId = session.personId
	var fromGuestIndex = session.guestIndex
	var payload = messageData.payload
	var type = messageData.type
	var clientUid = messageData.clientUid
	var conversationId = parseInt(messageData.conversationId)
	
	payload = Messages.cleanPayloadForUpload(type, payload)
	if (!payload) { return callback('That message is malformed') }
	
	parallel(_checkConversationAccess, _uploadPayload, function(err, _, payload) {
		if (err) { return callback(err) }
		log.debug('create message', conversationId, payload)
		var sql = 'INSERT INTO message SET postedTime=?, fromPersonId=?, fromGuestIndex=?, clientUid=?, conversationId=?, type=?, payloadJson=?'
		var now = time.now()
		db.conversation(conversationId).insert(sql, [now, fromPersonId, fromGuestIndex, clientUid, conversationId, type, JSON.stringify(payload)], function(err, messageId) {
			if (err) { return callback(err) }
			var message = {
				fromPersonId:fromPersonId, fromGuestIndex:fromGuestIndex,
				conversationId:conversationId, clientUid:clientUid,
				id:messageId, postedTime:now, type:type, payload:payload
			}
			callback(null, { message:message, promptInvite:false })
			_notifyParticipants(message, prodPush)
		})
	})
	
	function _uploadPayload(callback) {
		if (type != Messages.types.picture && type != Messages.types.audio) { return callback(null, payload) }
		payloadService.uploadPayload(fromPersonId, type, payloadFile, function(err, secret) {
			if (!err) { payload.secret = secret }
			return callback(err, payload)
		})
	}
	
	function _checkConversationAccess(callback) {
		if (fromGuestIndex) { return callback(session.conversationId == conversationId ? null : 'Bad conversation id') }
		var sql = 'SELECT 1 FROM participation WHERE personId=? AND conversationId=?'
		db.person(fromPersonId).selectOne(sql, [fromPersonId, conversationId], function(err, row) {
			if (err) { return callback(err) }
			if (!row) { return callback("I couldn't find that conversation") }
			callback()
		})
	}
}

function _notifyParticipants(message, prodPush) {
	var sql = 'SELECT peopleJson FROM conversation WHERE conversationId=?'
	log('notify participants for message', message)
	db.conversation(message.conversationId).selectOne(sql, [message.conversationId], function(err, res) {
		if (err) { return callback(err) }

		var people = jsonList(res.peopleJson)
		
		parallel(doUpdateParticipations, doSendNotifications, function(err) {
			if (err) { return log.error('error notifying participants', err) }
			log('done notifying participants')
		})
		
		function doUpdateParticipations(callback) {
			_updateParticipations(people, message, callback)
		}
		
		function doSendNotifications(callback) {
			_sendNotifications(people, message, callback)
		}
	})
	
	function _sendNotifications(people, message, callback) {
		var pushFromName
		var dogoRecipients = []
		var externalRecipients = []
		each(people, function(address, index) {
			if (!Addresses.isDogo(address)) {
				externalRecipients.push({ address:address, guestIndex:index })
			} else if (address.addressId == message.fromPersonId) {
				// Dogo sender
				pushFromName = address.name.split(' ')[0]
			} else {
				dogoRecipients.push(address.addressId)
			}
		})
		pushService.sendMessagePush(people, dogoRecipients, externalRecipients, pushFromName, message, prodPush, callback)
	}
	
	function _updateParticipations(people, message, callback) {
		log.debug('update participation summaries', people)
		asyncEach(people, {
			parallel:true,
			finish:callback,
			iterate:function(person, callback) {
				log.debug('update participation', person)
				var personId = person.personId
				if (!personId) { return }
				var sql = "SELECT peopleJson, recentJson, picturesJson, lastReceivedTime FROM participation WHERE personId=? AND conversationId=?"
				db.person(personId).selectOne(sql, [personId, message.conversationId], function(err, participation) {
					if (err) { return callback(err) }
					if (!participation) { return callback('Unknown converstaion participation') }
					var recent = jsonList(participation.recentJson)
					if (recent.length >= 3) { recent.shift() }
					recent.push(message)

					var pictures = jsonList(participation.picturesJson)
					if (message.type == 'picture') {
						if (pictures.length >= 6) {
							var i = Math.floor(Math.random() * 7)
							if (i != 7) { // 1 in 7 chance of skipping the picture
								pictures[i] = message
							}
						} else {
							pictures.push(message)
						}
					}
					
					var now = time.now()
					var isMyParticipation = (personId == message.fromPersonId)
					var lastReceivedTime = (isMyParticipation ? participation.lastReceivedTime : now)
					var recentJson = JSON.stringify(recent)
					var picturesJson = JSON.stringify(pictures)
					var sql = 'UPDATE participation SET lastMessageTime=?, lastReceivedTime=?, recentJson=?, picturesJson=? WHERE personId=? AND conversationId=?'
					db.person(personId).updateOne(sql, [now, lastReceivedTime, recentJson, picturesJson, personId, message.conversationId], function(err, res) {
						if (err) { return callback(err) }
					})
				})
			}
		})
	}
}

function saveFacebookRequest(personId, facebookRequestId, toPersonId, conversationId, callback) {
	callback('saveFacebookRequest is not implemented')
	// think through if this should go into lookupService, and what data is required
	// db.shard(facebookRequestId).insert(this,
	// 	'INSERT INTO facebookRequest SET createdTime=?, facebookRequestId=?, fromPersonId=?, toPersonId=?, conversationId=?',
	// 	[this.now(), facebookRequestId, personId, toPersonId, conversationId], function(err, res) {
	// 		if (err) { return callback(err) }
	// 		callback(null, 'OK')
	// 	})
}

function loadFacebookRequestId(facebookRequestId, callback) {
	callback('loadFacebookRequestId is not implemented')
	// db.shard(facebookRequestId).selectOne(
	// 	'SELECT fromPersonId, toPersonId, conversationId FROM facebookRequest WHERE facebookRequestId=?',
	// 	[facebookRequestId],
	// 	function(err, facebookRequest) {
	// 		if (err) { return callback(err) }
	// 		if (!facebookRequest) { return callback('Unknown facebook request') }
	// 		_selectMessages(facebookRequest.conversationId, function(err, messages) {
	// 			if (err) { return callback(err) }
	// 			callback(null, { messages:messages, facebookRequest:facebookRequest })
	// 		})
	// 	}
	// )
}
