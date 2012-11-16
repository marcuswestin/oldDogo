var trim = require('std/trim')
var sql = require('./util/sql')
var uuid = require('uuid')
var orderConversationIds = require('./util/ids').orderConversationIds

module.exports = proto(null,
	function(database, accountService, pushService, pictureService) {
		this.db = database
		this.accountService = accountService
		this.pushService = pushService
		this.pictureService = pictureService
	}, {
		getConversations: function(req, callback) {
			var accountId = req.session.accountId
			this.db.autocommit(this, function(ac) {
				callback = ac.wrapCallback(callback)
				req.timer.start('selectParticipants')
				ac.select(this, this.sql.selectParticipation+'WHERE partic.account_id=? ORDER BY lastMessageId DESC, conversationId DESC', [accountId], function(err, participations) {
					req.timer.stop('selectParticipants')
					if (err) { return callback(err) }

					populatePeople.call(this, participations)
					function populatePeople(participations) {
						serialMap(participations, {
							context:this,
							iterate: function populatePerson(partic, i, next) {
								req.timer.start('populatePerson')
								ac.selectOne(this, 'SELECT full_name as fullName, claimed_time as memberSince, facebook_id as facebookId, id FROM account WHERE id=?',
									[partic.personDogoId], function(err, res) {
										req.timer.stop('populatePerson')
										next(err, res)
									}
								)
							},
							finish:function(err, people) {
								if (err) { return callback(err) }
								populateMessages.call(this, participations, people)
							}
						})
					}
					
					function populateMessages(participartions, people) {
						serialMap(participartions, {
							context:this,
							iterate:function populateMessage(partic, next) {
								req.timer.start('populateMessage')
								var conversation = { id:partic.conversationId }
								this._selectMessage(ac, partic.lastReceivedMessageId, function(err, lastReceivedMessage) {
									if (err) { return next(err) }
									conversation.lastReceivedMessage = lastReceivedMessage
									this._selectMessage(ac, partic.lastReadMessageId, function(err, lastReadMessage) {
										if (err) { return next(err) }
										conversation.lastReadMessage = lastReadMessage
										this._selectMessage(ac, partic.lastMessageId, function(err, lastMessage) {
											if (err) { return next(err) }
											conversation.lastMessage = lastMessage
											req.timer.stop('populateMessage')
											next(null, conversation)
										})
									})
								})
							},
							finish:function(err, conversations) {
								if (err) { return callback(err) }
								mergeData.call(this, participations, people, conversations)
							}
						})
					}
					
					function mergeData(participartions, people, conversations) {
						req.timer.start('mergeData')
						each(conversations, function(convo, i) {
							convo.person = people[i]
						})
						req.timer.stop('mergeData')
						callback(null, conversations)
					}
				})
			})
		},
		
		sendMessage: function(accountId, toConversationId, toPersonId, clientUid, body, picture, prodPush, callback) {
			if (!body && !picture) { return callback('You tried to send an empty message.') }
			this.db.selectOne(this,
				'SELECT id FROM conversation_participation WHERE account_id=? AND conversation_id=?',
				[accountId, toConversationId], function(err, res) {
					if (err) { return callback(err) }
					if (!res) { return callback('Could not find that conversation') }
					var proceed = bind(this, function(err, pictureId) {
						if (err) { return callback(err) }
						this._createMessage(accountId, clientUid, toConversationId, toPersonId, body, pictureId, bind(this, function(err, message) {
							if (err) { return callback(err) }
							callback(null, { message:message, disableInvite:true })
							this.pushService.sendMessagePush(message, accountId, toPersonId, prodPush)
						}))
					})
					if (picture) {
						this.pictureService.upload(accountId, toConversationId, picture.base64Data, picture.width, picture.height, proceed)
					} else {
						proceed(null, null)
					}
				}
			)
		},
		
		getMessages: function(accountId, conversationId, callback) {
			this.db.selectOne(this, 'SELECT id FROM conversation_participation WHERE account_id=? AND conversation_id=?', [accountId, conversationId], function(err, res) {
				if (err) { return callback(err) }
				if (!res) { return callback('Unknown conversation') }
				var participationId = res.id
				this.db.select(this, this.sql.selectMessage+'WHERE conversation_id=? ORDER BY id DESC LIMIT 100', [conversationId], function(err, messages) {
					if (err) { return callback(err) }
					messages.reverse()
					callback(null, messages)
					var lastMessage = messages[messages.length - 1]
					if (!lastMessage) { return }
					this.db.updateOne(this, 'UPDATE conversation_participation SET last_read_message_id=? WHERE id=?', [lastMessage.id, participationId], function(err) {
						if (err) { return logErr(err, function() {}, 'getMessages._updateLastReadMessage') }
					})
				})
			})
		},
		saveFacebookRequest: function(accountId, facebookRequestId, toAccountId, conversationId, callback) {
			this.db.insert(this,
				'INSERT INTO facebook_request SET created_time=?, facebook_request_id=?, from_account_id=?, to_account_id=?, conversation_id=?',
				[this.db.time(), facebookRequestId, accountId, toAccountId, conversationId], function(err, res) {
					if (err) { return callback(err) }
					callback(null, 'OK')
				})
		},
		loadFacebookRequestId: function(facebookRequestId, callback) {
			this.db.selectOne(this,
				this.sql.selectFacebookRequest+'WHERE facebook_request_id=?', [facebookRequestId], function(err, facebookRequest) {
					if (err) { return callback(err) }
					if (!facebookRequest) { return callback('Unknown facebook request') }
					this._selectMessages(this.db, facebookRequest.conversationId, bind(this, function(err, messages) {
						if (err) { return logErr(err, callback, 'loadFacebookRequestId._selectMessages', facebookRequest.conversationId) }
						callback(null, { messages:messages, facebookRequest:facebookRequest })
					}))
					
				})
		},
		// _withContactAccountId: function(accountId, contactAccountId, contactFacebookId, callback) {
		// 	if (contactAccountId) {
		// 		callback.call(this, null, contactAccountId)
		// 	} else {
		// 		this.accountService.withFacebookContactId(accountId, contactFacebookId, bind(this, callback))
		// 	}
		// },
		_createConversationId: function(account1Id, account2Id, callback) {
			try { var ids = orderConversationIds(account1Id, account2Id) }
			catch (err) { return callback(err) }
			this.db.transact(this, function(tx) {
				callback = tx.wrapCallback(bind(this, callback))
				this._insertConversation(tx, ids, function(err, convoId) {
					if (err) { return callback(err) }
					this._insertParticipation(tx, convoId, ids.account1Id, function(err) {
						if (err) { return callback(err) }
						this._insertParticipation(tx, convoId, ids.account2Id, function(err) {
							if (err) { return callback(err) }
							callback.call(this, null, convoId)
						})
					})
				})
			})
		},
		_createMessage: function(accountId, clientUid, conversationId, toAccountId, body, pictureId, callback) {
			this.db.transact(this, function(tx) {
				callback = tx.wrapCallback(callback)
				this._insertMessage(tx, accountId, clientUid, conversationId, body, pictureId, function(err, messageId) {
					if (err) { return logError(err, callback, '_createMessage._insertMessage') }
					this._updateConversationLastMessage(tx, conversationId, messageId, function(err) {
						if (err) { return logErr(err, callback, '_createMessage._updateConversationLastMessage') }
						this._updateParticipationLastReceivedMessage(tx, toAccountId, conversationId, messageId, function(err) {
							if (err) { return logErr(err, callback, '_createMessage._updateParticipationLastReceivedMessage', toAccountId, conversationId, messageId) }
							if (err) { return callback(err) }
							this._selectMessage(tx, messageId, callback)
						})
					})
				})
			})
		},
		_insertConversation: function(conn, ids, callback) {
			var secret = uuid.v4()
			conn.insert(this,
				'INSERT INTO conversation SET created_time=?, account_1_id=?, account_2_id=?, secret=?',
				[conn.time(), ids.account1Id, ids.account2Id, secret], callback)
		},
		// _insertParticipation: function(conn, convoId, accountId, callback) {
		// 	conn.insert(this,
		// 		'INSERT INTO conversation_participation SET conversation_id=?, account_id=?',
		// 		[convoId, accountId], callback)
		// },
		_insertMessage: function(conn, accountId, clientUid, convoId, body, pictureId, callback) {
			conn.insert(this,
				'INSERT INTO message SET sent_time=?, sender_account_id=?, client_uid=?, conversation_id=?, body=?, picture_id=?',
				[conn.time(), accountId, clientUid, convoId, body, pictureId], callback)
		},
		_selectMessage: function(conn, messageId, callback) {
			conn.selectOne(this, this.sql.selectMessage+' WHERE message.id=?', [messageId], callback)
		},
		_selectMessages: function(conn, convoId, callback) {
			conn.select(this, this.sql.selectMessage+' WHERE conversation_id=? ORDER BY id DESC LIMIT 50', [convoId], function(err, messages) {
				messages.reverse()
				callback(err, messages)
			})
		},
		_updateConversationLastMessage: function(conn, convoId, messageId, callback) {
			conn.updateOne(this, 'UPDATE conversation SET last_message_id=? WHERE id=?', [messageId, convoId], callback)
		},
		_updateParticipationLastReceivedMessage: function(conn, toAccountId, conversationId, messageId, callback) {
			conn.updateOne(this,
				'UPDATE conversation_participation SET last_received_message_id=? WHERE conversation_id=? AND account_id=?',
				[messageId, conversationId, toAccountId], callback)
		},
		sql: {

			selectMessage:sql.selectFrom('message', {
				id:'message.id',
				senderAccountId:'message.sender_account_id',
				clientUid:'message.client_uid',
				conversationId:'message.conversation_id',
				sentTime:'message.sent_time',
				body:'message.body',
				pictureId:'picture.id',
				pictureSecret:'picture.secret',
				pictureWidth:'picture.width',
				pictureHeight:'picture.height'
			}) + 'LEFT OUTER JOIN picture ON message.picture_id=picture.id ',
			
			selectConvo:sql.selectFrom('conversation', {
				id:'id',
				account1Id:'account_1_id',
				account2Id:'account_2_id',
				createdTime: 'created_time',
				lastMessageId: 'last_message_id',
				secret: 'secret'
			}),
			
			selectParticipation:sql.selectFrom('conversation_participation partic', {
				personDogoId: '(CASE convo.account_1_id WHEN partic.account_id THEN convo.account_2_id ELSE convo.account_1_id END)',
				conversationId: 'partic.conversation_id',
				lastReceivedMessageId: 'partic.last_received_message_id',
				lastReadMessageId: 'partic.last_read_message_id',
				lastMessageId: 'convo.last_message_id'
			}) + 'INNER JOIN conversation convo ON partic.conversation_id=convo.id\n',
			
			selectFacebookRequest:sql.selectFrom('facebook_request', {
				fromAccountId: 'from_account_id',
				toAccountId: 'to_account_id',
				conversationId: 'conversation_id'
			})
		}
	}
)
