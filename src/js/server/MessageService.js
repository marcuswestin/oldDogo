var trim = require('std/trim')
var sql = require('./util/sql')
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
			var dogoId = req.session.dogoId
			this.db.autocommit(this, function(ac) {
				callback = ac.wrapCallback(callback)
				req.timer.start('selectParticipants')
				ac.select(this, this.sql.selectParticipation+'WHERE account_id=? ORDER BY lastMessageTime DESC, id DESC', [dogoId], function(err, participations) {
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
		
		sendMessage: function(dogoId, conversationId, clientUid, type, payload, prodPush, callback) {
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
					'SELECT id FROM conversation_participation WHERE account_id=? AND conversation_id=?',
					[dogoId, conversationId],
					function(err, res) {
						if (err) { return callback(err) }
						if (!res) { return callback("I couldn't find that conversation") }
						var proceed = bind(this, function(err) {
							if (err) { return callback(err) }
							conn.insert(this,
								'INSERT INTO message SET sent_time=?, sender_account_id=?, client_uid=?, conversation_id=?, type=?, payloadJson=?',
								[conn.time(), dogoId, clientUid, conversationId, Messages.types[type], JSON.stringify(payload)],
								function(err, messageId) {
									if (err) { return logError(err, callback, 'sendMessage.insert') }
									var message = { 
										id:messageId, senderDogoId:dogoId, conversationId:conversationId, clientUid:clientUid,
										sentTime:conn.time(), type:type, payload:payload
									}
									var self = this
									conn.select(this, "SELECT * FROM conversation_participation WHERE conversation_id=?", [conversationId], function(err, participations) {
										if (err) { return callback(err) }
										serialMap(participations, {
											filterNulls:true,
											iterate:function(partic, next) {
												var isMyParticipation = (partic.account_id == dogoId)
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
													'UPDATE conversation_participation SET lastMessageTime=?, lastReceivedTime=?, summaryJson=? WHERE id=?',
													[conn.time(), lastReceivedTime, JSON.stringify(summary), partic.id],
													function(err, res) {
														next(err, isMyParticipation ? null : partic.account_id)
													}
												)
											},
											finish:function(err, recipientDogoIds) {
												if (err) { return callback(err) }
												each(recipientDogoIds, function(recipientDogoId) {
													conn.commit()
													callback(null, { message:message, disableInvite:false })
													self.pushService.sendMessagePush(message, dogoId, recipientDogoId, prodPush)
												})
											}
										})
									})
								}
							)
						})

						if (type == 'picture') {
							this.pictureService.upload(dogoId, conversationId, payload.base64Data, function(err, pictureSecret) {
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
		
		getMessages: function(dogoId, conversationId, callback) {
			this.db.selectOne(this, 'SELECT id FROM conversation_participation WHERE account_id=? AND conversation_id=?', [dogoId, conversationId], function(err, res) {
				if (err) { return callback(err) }
				if (!res) { return callback('Unknown conversation') }
				var participationId = res.id
				this._selectMessages(this.db, conversationId, function(err, messages) {
					if (err) { return callback(err) }
					callback(null, messages)
					var lastMessage = messages[messages.length - 1]
					if (!lastMessage) { return }
					this.db.updateOne(this, 'UPDATE conversation_participation SET lastReadTime=? WHERE id=?',
						[this.db.time(), participationId],
						function(err) {
							if (err) { return logErr(err, function() {}, 'getMessages._updateLastReadMessage')
						}
					})
				})
			})
		},
		saveFacebookRequest: function(dogoId, facebookRequestId, toAccountId, conversationId, callback) {
			this.db.insert(this,
				'INSERT INTO facebook_request SET created_time=?, facebook_request_id=?, from_account_id=?, to_account_id=?, conversation_id=?',
				[this.db.time(), facebookRequestId, dogoId, toAccountId, conversationId], function(err, res) {
					if (err) { return callback(err) }
					callback(null, 'OK')
				})
		},
		loadFacebookRequestId: function(facebookRequestId, callback) {
			this.db.selectOne(this,
				this.sql.selectFacebookRequest+'WHERE facebook_request_id=?', [facebookRequestId], function(err, facebookRequest) {
					if (err) { return callback(err) }
					if (!facebookRequest) { return callback('Unknown facebook request') }
					this._selectMessages(this.db, facebookRequest.conversationId, function(err, messages) {
						if (err) { return logErr(err, callback, 'loadFacebookRequestId._selectMessages', facebookRequest.conversationId) }
						callback(null, { messages:messages, facebookRequest:facebookRequest })
					})
				})
		},
		_selectMessage: function(conn, messageId, callback) {
			conn.selectOne(this, this.sql.selectMessage+' WHERE message.id=?', [messageId], function(err, message) {
				if (err) { return callback.call(this, err) }
				if (message) { decodeMessage(message) }
				callback.call(this, null, message)
			})
		},
		_selectMessages: function(conn, convoId, callback) {
			conn.select(this, this.sql.selectMessage+' WHERE conversation_id=? ORDER BY id DESC LIMIT 50', [convoId], function(err, messages) {
				messages.reverse()
				each(messages, decodeMessage)
				callback.call(this, err, messages)
			})
		},
		sql: {

			selectMessage:sql.selectFrom('message', {
				id:'id',
				senderDogoId:'sender_account_id',
				clientUid:'client_uid',
				conversationId:'conversation_id',
				type:'type',
				sentTime:'sent_time',
				payloadJson:'payloadJson'
			}),
			
			selectConvo:sql.selectFrom('conversation', {
				id:'id',
				account1Id:'account_1_id',
				account2Id:'account_2_id',
				createdTime: 'created_time',
				secret: 'secret'
			}),
			
			selectParticipation:sql.selectFrom('conversation_participation', {
				id: 'conversation_id',
				lastMessageTime: 'lastMessageTime',
				lastReceivedTime: 'lastReceivedTime',
				lastReadTime: 'lastReadTime',
				summaryJson:'summaryJson'
			}),
			
			selectFacebookRequest:sql.selectFrom('facebook_request', {
				fromAccountId: 'from_account_id',
				toAccountId: 'to_account_id',
				conversationId: 'conversation_id'
			})
		}
	}
)

function decodeMessage(message) {
	message.type = Messages.types.reverse[message.type]
	message.payload = JSON.parse(message.payloadJson)
	delete message.payloadJson
}
