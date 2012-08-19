var trim = require('std/trim')
var sql = require('./util/sql')
var uuid = require('uuid')

module.exports = proto(null,
	function(database, accountService, pushService, pictureService) {
		this.db = database
		this.accountService = accountService
		this.pushService = pushService
		this.pictureService = pictureService
	}, {
		listConversations: function(accountId, callback) {
			this._selectParticipations(this.db, accountId, function(err, conversations) {
				if (err) { return callback(err) }
				for (var i=0, convo; convo=conversations[i]; i++) {
					var acc1 = convo.account1Id,
						acc2 = convo.account2Id
					convo.withAccountId = (acc1 == accountId ? acc2 : acc1)
					
					// BACKCOMPAT REMOVE
					if (convo.lastReceivedPictureId) {
						convo.lastReceivedPayloadId = convo.lastReceivedPictureId
						convo.lastReceivedPayloadType = 'picture'
					}
				}
				callback(null, conversations)
			})
		},
		sendMessage: function(accountId, toFacebookAccountId, toAccountId, body, base64Picture, pictureWidth, pictureHeight, prodPush, callback) {
			if (body) {
				body = trim(body)
				if (!body) { return callback('Empty body') }
			} else if (!base64Picture) {
				return callback('Empty message')
			}
			
			this._withContactAccountId(accountId, toAccountId, toFacebookAccountId, function(err, toAccountId) {
				if (err) { return callback(err) }
				this.withConversation(accountId, toAccountId, bind(this, function(err, conversation) {
					if (err) { return logErr(err, callback, 'sendMessage.withConversationInfo', accountId, toAccountId) }
					
					var proceed = bind(this, function(err, pictureId) {
						if (err) { return callback(err) }
						this._createMessage(accountId, toAccountId, conversation.id, body, pictureId, bind(this, function(err, message) {
							if (err) { return callback(err) }
							this.pushService.sendMessagePush(message, accountId, toAccountId, prodPush)
							callback(null, { message:message, toAccountId:toAccountId, toFacebookId:toFacebookAccountId, disableInvite:true })
						}))
					})
					
					if (base64Picture) {
						this.pictureService.upload(accountId, conversation, base64Picture, pictureWidth, pictureHeight, proceed)
					} else {
						proceed(null, null)
					}
				}))
			})
		},
		getMessages: function(accountId, withAccountId, withFacebookId, callback) {
			this._withContactAccountId(accountId, withAccountId, withFacebookId, function(err, withAccountId) {
				if (err) { return callback(err) }
				this.getConversation(accountId, withAccountId, bind(this, function(err, conversation) {
					if (err) { return logErr(err, callback, 'getMessages.getConversation', accountId, withAccountId) }
					if (!conversation) { return callback(null, []) }
					this._selectMessages(this.db, conversation.id, bind(this, function(err, messages) {
						if (err) { return logErr(err, callback, 'getMessages._selectMessages', conversation.id) }
						callback(null, messages)
						this._markLastReadMessage(accountId, conversation.id, messages)
					}))
				}))
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
					this._selectMessages(this.db, facebookRequest.conversationId, false, bind(this, function(err, messages) {
						if (err) { return logErr(err, callback, 'loadFacebookRequestId._selectMessages', facebookRequest.conversationId) }
						callback(null, { messages:messages, facebookRequest:facebookRequest })
					}))
					
				})
		},
		_markLastReadMessage:function(accountId, conversationId, messages) {
			var lastMessage = messages[messages.length - 1]
			if (!lastMessage) { return }
			this._updateLastReadMessage(this.db, accountId, conversationId, lastMessage.id, function(err) {
				if (err) { return logErr(err, function() {}, 'getMessages._updateLastReadMessage') }
			})
		},
		_withContactAccountId: function(accountId, contactAccountId, contactFacebookId, callback) {
			if (contactAccountId) {
				callback.call(this, null, contactAccountId)
			} else {
				this.accountService.withFacebookContactId(accountId, contactFacebookId, bind(this, callback))
			}
		},
		getConversation: function(account1Id, account2Id, callback) {
			try { var ids = this._orderConvoIds(account1Id, account2Id) }
			catch (err) { return callback(err) }
			this._selectConversation(this.db, ids.account1Id, ids.account2Id, callback)
		},
		withConversation: function(account1Id, account2Id, callback) {
			this.getConversation(account1Id, account2Id, bind(this, function(err, conversation) {
				if (err) { return callback(err) }
				if (conversation) {
					callback.call(this, null, conversation)
				} else {
					this._createConversationId(account1Id, account2Id, function(err, conversationId) {
						if (err) { return callback(err) }
						this._selectConversationById(this.db, conversationId, callback)
					})
				}
			}))
		},
		_createConversationId: function(account1Id, account2Id, callback) {
			try { var ids = this._orderConvoIds(account1Id, account2Id) }
			catch (err) { return callback(err) }
			this.db.transact(this, function(tx) {
				callback = txCallback(tx, callback, this)
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
		_createMessage: function(accountId, toAccountId, conversationId, body, pictureId, callback) {
			this.db.transact(this, function(tx) {
				callback = txCallback(tx, callback)
				this._insertMessage(tx, accountId, conversationId, body, pictureId, function(err, messageId) {
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
		_orderConvoIds: function(id1, id2) {
			if (typeof id1 == 'string') { id1 = parseInt(id1, 10) }
			if (typeof id2 == 'string') { id2 = parseInt(id2, 10) }
			if ((typeof id1 != 'number') || (typeof id2 != 'number')) { throw new Error('Bad id') }
			return id1 < id2
				? { account1Id:id1, account2Id:id2 }
				: { account1Id:id2, account2Id:id1 }
		},
		_insertConversation: function(conn, ids, callback) {
			var secret = uuid.v4()
			conn.insert(this,
				'INSERT INTO conversation SET created_time=?, account_1_id=?, account_2_id=?, secret=?',
				[conn.time(), ids.account1Id, ids.account2Id, secret], callback)
		},
		_insertParticipation: function(conn, convoId, accountId, callback) {
			conn.insert(this,
				'INSERT INTO conversation_participation SET conversation_id=?, account_id=?',
				[convoId, accountId], callback)
		},
		_insertMessage: function(conn, accountId, convoId, body, pictureId, callback) {
			conn.insert(this,
				'INSERT INTO message SET sent_time=?, sender_account_id=?, conversation_id=?, body=?, picture_id=?',
				[conn.time(), accountId, convoId, body, pictureId], callback)
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
		_selectParticipations: function(conn, accountId, callback) {
			conn.select(this, this.sql.selectParticipation
				+ 'WHERE partic.account_id=?\n'
				+ 'ORDER BY last_received.sent_time DESC, convo.created_time DESC, convo.id DESC', [accountId], callback)
		},
		_selectConversation: function(conn, account1Id, account2Id, callback) {
			conn.selectOne(this, this.sql.selectConvo+'WHERE account_1_id=? AND account_2_id=?', [account1Id, account2Id], callback)
		},
		_selectConversationById: function(conn, conversationId, callback) {
			conn.selectOne(this, this.sql.selectConvo+'WHERE id=?', [conversationId], callback)
		},
		_updateConversationLastMessage: function(conn, convoId, messageId, callback) {
			conn.updateOne(this, 'UPDATE conversation SET last_message_id=? WHERE id=?', [messageId, convoId], callback)
		},
		_updateParticipationLastReceivedMessage: function(conn, toAccountId, conversationId, messageId, callback) {
			conn.updateOne(this,
				'UPDATE conversation_participation SET last_received_message_id=? WHERE conversation_id=? AND account_id=?',
				[messageId, conversationId, toAccountId], callback)
		},
		_updateLastReadMessage: function(conn, accountId, conversationId, messageId, callback) {
			conn.updateOne(this,
				'UPDATE conversation_participation SET last_read_message_id=? WHERE conversation_id=? AND account_id=?',
				[messageId, conversationId, accountId], callback)
		},
		sql: {

			selectMessage:sql.selectFrom('message', {
				id:'message.id',
				senderAccountId:'message.sender_account_id',
				conversationId:'message.conversation_id',
				sentTime:'message.sent_time',
				body:'message.body',
				pictureId:'picture.id',
				pictureSecret:'picture.secret',
				pictureWidth:'picture.width',
				pictureHeight:'picture.height'
			}) + 'LEFT OUTER JOIN picture ON message.picture_id=picture.id',
			
			selectConvo:sql.selectFrom('conversation', {
				id:'id',
				account1Id:'account_1_id',
				account2Id:'account_2_id',
				createdTime: 'created_time',
				lastMessageId: 'last_message_id',
				secret: 'secret'
			}),
			
			selectParticipation:sql.selectFrom('conversation_participation partic', {
				account1Id: 'convo.account_1_id',
				account2Id: 'convo.account_2_id',
				id: 'partic.conversation_id',
				lastReceivedBody: 'last_received.body',
				lastReceivedTime: 'last_received.sent_time',
				lastReceivedPictureId: 'last_received.picture_id',
				lastReceivedMessageId: 'last_received.id',
				lastReadMessageId: 'partic.last_read_message_id',
				// TODO Remove lastMessage*
				lastMessageBody: 'last_message.body',
				lastMessageTime: 'last_message.sent_time',
				lastMessageFromId: 'last_message.sender_account_id'
			})
			+ 'INNER JOIN conversation convo ON partic.conversation_id=convo.id\n'
			+ 'LEFT OUTER JOIN message last_message ON convo.last_message_id=last_message.id\n'
			+ 'LEFT OUTER JOIN message last_received ON partic.last_received_message_id=last_received.id\n',
			// TODO remove last_message join
			
			selectFacebookRequest:sql.selectFrom('facebook_request', {
				fromAccountId: 'from_account_id',
				toAccountId: 'to_account_id',
				conversationId: 'conversation_id'
			})
		}
	}
)
