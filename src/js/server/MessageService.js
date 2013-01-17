var trim = require('std/trim')
var uuid = require('uuid')
var orderConversationIds = require('./util/ids').orderConversationIds
var Messages = require('data/Messages')

module.exports = proto(null,
	function(database, accountService, pushService, pictureService) {
		this.db = database
		this.accountService = accountService
		this.pushService = pushService
		this.pictureService = pictureService
	}, {
		getConversations: function(req, callback) {
			var personId = req.session.personId
			this.db.autocommit(this, function(ac) {
				callback = ac.wrapCallback(callback)
				req.timer.start('selectParticipants')
				ac.select(this, sql.selectParticipation+'WHERE personId=? ORDER BY lastMessageTime DESC, id DESC', [personId], function(err, participations) {
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
				})
			})
		},
		
		sendMessage: function(personId, conversationId, clientUid, type, payload, prodPush, callback) {
			// 1. Check that sender has right to send to this conversation
			// 2. Upload assets, if any
			// 3. Create message
			// 4. Update conversation participations (this may later be done by each receiver upon notification in step 4.)
			// 5. Notify receivers
			if (!Messages.types[type]) { return callback("I don't recognize that message type") }
			if (!Messages.payload.verify(type, payload)) { return callback("That message is missing properties") }
			this.db.transact(this, function(conn) {
				callback = conn.wrapCallback(callback)
				conn.selectOne(this,
					'SELECT id FROM conversationParticipation WHERE personId=? AND conversationId=?',
					[personId, conversationId],
					function(err, res) {
						if (err) { return callback(err) }
						if (!res) { return callback("I couldn't find that conversation") }
						var proceed = bind(this, function(err) {
							if (err) { return callback(err) }
							conn.insert(this,
								'INSERT INTO message SET sentTime=?, senderPersonId=?, clientUid=?, conversationId=?, type=?, payloadJson=?',
								[conn.time(), personId, clientUid, conversationId, Messages.types[type], JSON.stringify(payload)],
								function(err, messageId) {
									if (err) { return logError(err, callback, 'sendMessage.insert') }
									var message = { 
										id:messageId, senderPersonId:personId, conversationId:conversationId, clientUid:clientUid,
										sentTime:conn.time(), type:type, payload:payload
									}
									var self = this
									conn.select(this, "SELECT id, personId, summaryJson, lastReceivedTime FROM conversationParticipation WHERE conversationId=?", [conversationId], function(err, participations) {
										if (err) { return callback(err) }
										serialMap(participations, {
											filterNulls:true,
											iterate:function(partic, next) {
												var isMyParticipation = (partic.personId == personId)
												var summary = JSON.parse(partic.summaryJson)
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
												console.log("UPDATED SUMMARY", partic.id, JSON.stringify(summary))
												
												var lastReceivedTime = (isMyParticipation ? partic.lastReceivedTime : conn.time())
												conn.updateOne(self,
													'UPDATE conversationParticipation SET lastMessageTime=?, lastReceivedTime=?, summaryJson=? WHERE id=?',
													[conn.time(), lastReceivedTime, JSON.stringify(summary), partic.id],
													function(err, res) {
														next(err, isMyParticipation ? null : partic.personId)
													}
												)
											},
											finish:function(err, recipientPersonIds) {
												if (err) { return callback(err) }
												each(recipientPersonIds, function(recipientPersonId) {
													conn.commit()
													callback(null, { message:message, disableInvite:false })
													self.pushService.sendMessagePush(message, personId, recipientPersonId, prodPush)
												})
											}
										})
									})
								}
							)
						})

						if (type == 'picture') {
							this.pictureService.upload(personId, conversationId, payload.base64Data, function(err, pictureSecret) {
								if (!err) {
									delete payload.base64Data
									payload.secret = pictureSecret
								}
								proceed(err)
							})
						} else {
							proceed(null, null)
						}
					}
				)
			})
		},
		
		getMessages: function(personId, conversationId, callback) {
			this.db.selectOne(this, 'SELECT id FROM conversationParticipation WHERE personId=? AND conversationId=?', [personId, conversationId], function(err, res) {
				if (err) { return callback(err) }
				if (!res) { return callback('Unknown conversation') }
				var participationId = res.id
				this._selectMessages(this.db, conversationId, function(err, messages) {
					if (err) { return callback(err) }
					callback(null, messages)
					var lastMessage = messages[messages.length - 1]
					if (!lastMessage) { return }
					this.db.updateOne(this, 'UPDATE conversationParticipation SET lastReadTime=? WHERE id=?',
						[this.db.time(), participationId],
						function(err) {
							if (err) { return logErr(err, function() {}, 'getMessages._updateLastReadMessage')
						}
					})
				})
			})
		},
		saveFacebookRequest: function(personId, facebookRequestId, toPersonId, conversationId, callback) {
			this.db.insert(this,
				'INSERT INTO facebookRequest SET createdTime=?, facebookRequestId=?, fromPersonId=?, toPersonId=?, conversationId=?',
				[this.db.time(), facebookRequestId, personId, toPersonId, conversationId], function(err, res) {
					if (err) { return callback(err) }
					callback(null, 'OK')
				})
		},
		loadFacebookRequestId: function(facebookRequestId, callback) {
			this.db.selectOne(this,
				sql.selectFacebookRequest+'WHERE facebookRequestId=?', [facebookRequestId], function(err, facebookRequest) {
					if (err) { return callback(err) }
					if (!facebookRequest) { return callback('Unknown facebook request') }
					this._selectMessages(this.db, facebookRequest.conversationId, function(err, messages) {
						if (err) { return logErr(err, callback, 'loadFacebookRequestId._selectMessages', facebookRequest.conversationId) }
						callback(null, { messages:messages, facebookRequest:facebookRequest })
					})
				})
		},
		_selectMessage: function(conn, messageId, callback) {
			conn.selectOne(this, sql.selectMessage+' WHERE message.id=?', [messageId], function(err, message) {
				if (err) { return callback.call(this, err) }
				if (message) { decodeMessage(message) }
				callback.call(this, null, message)
			})
		},
		_selectMessages: function(conn, convoId, callback) {
			conn.select(this, sql.selectMessage+' WHERE conversationId=? ORDER BY id DESC LIMIT 50', [convoId], function(err, messages) {
				messages.reverse()
				each(messages, decodeMessage)
				callback.call(this, err, messages)
			})
		}
	}
)

var sql = {
	selectMessage:'SELECT id, senderPersonId, clientUid, conversationId, type, sentTime, payloadJson FROM message ',
	selectParticipation:'SELECT conversationId as id, lastMessageTime, lastReceivedTime, lastReadTime, summaryJson FROM conversationParticipation ',
	selectFacebookRequest:'SELECT fromPersonId, toPersonId, conversationId FROM facebookRequest '
}

function decodeMessage(message) {
	message.type = Messages.types.reverse[message.type]
	message.payload = JSON.parse(message.payloadJson)
	delete message.payloadJson
}
