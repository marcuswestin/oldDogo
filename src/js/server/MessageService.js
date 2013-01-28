var trim = require('std/trim')
var uuid = require('uuid')
var orderConversationIds = require('./util/ids').orderConversationIds
var Messages = require('data/Messages')
var pushService = require('server/PushService')
var db = require('server/Database')
var payloadService = require('server/payloadService')

module.exports = {
	getConversations: getConversations,
	sendMessage: sendMessage,
	getMessages: getMessages,
	saveFacebookRequest: saveFacebookRequest,
	loadFacebookRequestId: loadFacebookRequestId
}

function getConversations(req, callback) {
	var personId = req.session.personId
	req.timer.start('selectParticipants')
	var selectParticipationsSql = [
		'SELECT conversationId, lastMessageTime, lastReceivedTime, lastReadTime, summaryJson',
		'FROM conversationParticipation WHERE personId=? ORDER BY lastMessageTime DESC, conversationId DESC'
	].join('\n')
	db.shard(personId).select(
		selectParticipationsSql,
		[personId],
		function(err, participations) {
			req.timer.stop('selectParticipants')
			if (err) { return callback(err) }
			req.timer.start('decodeSummaries')
			each(participations, function(partic) {
				partic.summary = JSON.parse(partic.summaryJson)
				delete partic.summaryJson
				if (!partic.summary.recent) {
					partic.summary.recent = []
				}
				if (!partic.summary.pictures) {
					partic.summary.pictures = []
				}
			})
			req.timer.stop('decodeSummaries')
			callback(null, participations)
		}
	)
}
		
function sendMessage(personId, conversationId, clientUid, type, payload, dataFile, prodPush, callback) {
	// 1. Check that sender has right to send to this conversation
	// 2. Upload assets, if any
	// 3. Create message
	// 4. Update conversation participations (this may later be done by each receiver upon notification in step 4.)
	// 5. Notify receivers
	if (!Messages.types[type]) { return callback("I don't recognize that message type") }
	
	payload = Messages.payload.cleanForUpload(type, payload)
	if (!payload) { return callback('That message is malformed') }
	
	db.shard(personId).selectOne(
		'SELECT participationId FROM conversationParticipation WHERE personId=? AND conversationId=?',
		[personId, conversationId],
		function(err, res) {
			if (err) { return callback(err) }
			if (!res) { return callback("I couldn't find that conversation") }
			if (type == 'picture' || type == 'audio') {
				payloadService.upload(personId, conversationId, type, dataFile, function(err, pictureSecret) {
					if (!err) {
						payload.secret = pictureSecret
					}
					createMessage(payload)
				})
			} else {
				createMessage()
			}
			
			function createMessage() {
				db.shard(conversationId).transact(function(tx) {
					callback = tx.wrapCallback(callback)
					tx.insert(
						'INSERT INTO message SET sentTime=?, fromPersonId=?, clientUid=?, conversationId=?, type=?, payloadJson=?',
						[db.time(), personId, clientUid, conversationId, Messages.types[type], JSON.stringify(payload)],
						function(err, messageId) {
							if (err) { return callback(err) }
							var message = {
								id:messageId, fromPersonId:personId, conversationId:conversationId, clientUid:clientUid,
								sentTime:db.time(), type:type, payload:payload
							}
							tx.selectOne(
								'SELECT participantsJson FROM conversation WHERE conversationId=?',
								[conversationId],
								function(err, res) {
									if (err) { return callback(err) }
									
									var participants = JSON.parse(res.participantsJson) // [{ personId:personId, name:personName }, ...]
									var fromParticipantName
									var recipientParticipantIds = filter(participants, function(participant) {
										var isMe = (participant.personId == message.fromPersonId)
										if (isMe) {
											fromParticipantName = participant.name
											return null
										} else {
											return participant.personId
										}
									})
									callback(null, { message:message, disableInvite:false })
									// do the rest in parallel
									_notifyRecipients(recipientParticipantIds, fromParticipantName, message, prodPush)
									_updateParticipations(participants, message)
								}
							)
						}
					)
				})
			}
		}
	)
}

function _notifyRecipients(recipientParticipants, fromParticipantName, message, prodPush) {
	each(recipientParticipants, function(recipientParticipant) {
		var pushFromName = fromParticipantName.split(' ')[0]
		pushService.sendMessagePush(recipientParticipant.personId, pushFromName, message, prodPush)
	})
}

function _updateParticipations(participants, message) {
	each(participants, function(participantInfo) {
		var participantId = participantInfo.personId
		db.shard(participantId).selectOne(
			"SELECT participationId, personId, summaryJson, lastReceivedTime FROM conversationParticipation WHERE personId=? AND conversationId=?",
			[participantId, message.conversationId],
			function(err, participation) {
				var summary = JSON.parse(participation.summaryJson)
				if (!summary.recent) { summary.recent = [] }
				if (!summary.pictures) { summary.pictures = [] }
				if (summary.recent.length >= 3) { summary.recent.shift() }
				summary.recent.push(message)

				if (message.type == 'picture') {
					if (summary.pictures.length >= 6) {
						var i = Math.floor(Math.random() * 7)
						if (i != 7) { // 1 in 7 chance of skipping the picture
							summary.pictures[i] = message
						}
					} else {
						summary.pictures.push(message)
					}
				}

				var isMyParticipation = (participantId == message.fromPersonId)
				var lastReceivedTime = (isMyParticipation ? participation.lastReceivedTime : db.time())
				db.shard(participation.participationId).updateOne(
					'UPDATE conversationParticipation SET lastMessageTime=?, lastReceivedTime=?, summaryJson=? WHERE participationId=?',
					[db.time(), lastReceivedTime, JSON.stringify(summary), participation.participationId],
					function(err, res) {
						if (err) { log.error("Error updating conversationParticipation", err, participantId) }
					}
				)
			}
		)
	})
}

function getMessages(personId, conversationId, callback) {
	// This could be sped up by checking conversation.participantsJson instead of selecting from conversationParticipation
	db.shard(personId).selectOne(
		'SELECT participationId FROM conversationParticipation WHERE personId=? AND conversationId=?',
		[personId, conversationId],
		function(err, res) {
			if (err) { return callback(err) }
			if (!res) { return callback('Unknown conversation') }
			var participationId = res.participationId
			_selectMessages(conversationId, function(err, messages) {
				if (err) { return callback(err) }
				callback(null, messages)
				var lastMessage = messages[messages.length - 1]
				if (!lastMessage) { return }
				// Update the lastReadTime
				db.shard(conversationId).updateOne(
					'UPDATE conversationParticipation SET lastReadTime=? WHERE participationId=?',
					[db.time(), participationId],
					function(err) {
						if (err) { log.error('Could not update conversatioParticipation lastReadTime', participationId, err) }
					}
				)
			})
		}
	)
}

function saveFacebookRequest(personId, facebookRequestId, toPersonId, conversationId, callback) {
	callback('saveFacebookRequest is not implemented')
	// think through if this should go into lookupService, and what data is required
	// db.shard(facebookRequestId).insert(this,
	// 	'INSERT INTO facebookRequest SET createdTime=?, facebookRequestId=?, fromPersonId=?, toPersonId=?, conversationId=?',
	// 	[this.db.time(), facebookRequestId, personId, toPersonId, conversationId], function(err, res) {
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

function _selectMessages(conversationId, callback) {
	var selectMessageSql = [
		'SELECT messageId, fromPersonId, clientUid, conversationId, type, sentTime, payloadJson',
		'FROM message WHERE conversationId=? ORDER BY messageId DESC LIMIT 50'
	].join('\n')
	db.shard(conversationId).select(
		selectMessageSql,
		[conversationId],
		function(err, messages) {
			if (err) { return callback(err) }
			messages.reverse()
			each(messages, _decodeMessage)
			callback(null, messages)
		}
	)
}
function _decodeMessage(message) {
	message.type = Messages.types.reverse[message.type]
	message.payload = JSON.parse(message.payloadJson)
	delete message.payloadJson
}
