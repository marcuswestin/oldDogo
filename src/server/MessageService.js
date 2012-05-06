var trim = require('std/trim'),
	sql = require('./util/sql')

module.exports = proto(null,
	function(database, accountService, pushService) {
		this.db = database
		this.accountService = accountService
		this.pushService = pushService
	}, {
		listConversations: function(accountId, callback) {
			this._selectParticipations(this.db, accountId, function(err, conversations) {
				if (err) { return callback(err) }
				for (var i=0, convo; convo=conversations[i]; i++) {
					var acc1 = convo.account1Id,
						acc2 = convo.account2Id
					convo.withAccountId = (acc1 == accountId ? acc2 : acc1)
				}
				callback(null, conversations)
			})
		},
		sendMessage: function(accountId, toFacebookAccountId, toAccountId, body, prodPush, callback) {
			body = trim(body)
			if (!body) { return callback('Empty body') }
			this._withContactAccountId(accountId, toFacebookAccountId, toAccountId, function(err, toAccountId) {
				if (err) { return callback(err) }
				this.withConversationId(accountId, toAccountId, bind(this, function(err, conversationId) {
					this._createMessage(accountId, toAccountId, conversationId, body, bind(this, function(err, message) {
						if (err) { return callback(err) }
						this.pushService.sendMessage(message, toAccountId, prodPush)
						callback(null, { message:message })
					}))
				}))
			})
		},
		getMessages: function(accountId, withFacebookId, withAccountId, lastReadMessageId, callback) {
			this._withContactAccountId(accountId, withFacebookId, withAccountId, function(err, withAccountId) {
				if (err) { return logErr(err, callback, 'getMessages._withContactAccountId', accountId, withFacebookId, withAccountId) }
				this.getConversation(accountId, withAccountId, bind(this, function(err, conversation) {
					if (err) { return logErr(err, callback, 'getMessages.getConversation', accountId, withAccountId) }
					if (!conversation) { return callback(null, []) }
					this._selectMessages(this.db, conversation.id, bind(this, function(err, messages) {
						if (err) { return logErr(err, callback, 'getMessages._selectMessages', conversation.id) }
						callback(null, messages)
						this._markLastReadMessage(accountId, conversation.id, messages, lastReadMessageId)
					}))
				}))
			})
		},
		_markLastReadMessage:function(accountId, conversationId, messages, lastReadMessageId) {
			// Find most recent message sent not by me
			for (var i=0; i<messages.length; i++) {
				var message = messages[i]
				if (lastReadMessageId && message.id < lastReadMessageId) {
					// We've already seen this message before - no need to continue
					return
				}
				if (message.senderAccountId != accountId) {
					this._updateLastReadMessage(this.db, accountId, conversationId, message.id, function(err) {
						if (err) { return logErr(err, function() {}, 'getMessages._updateLastReadMessage') }
					})
					return // We can stop after we find the first message
				} 
			}
		},
		_withContactAccountId: function(accountId, contactFacebookId, contactAccountId, callback) {
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
		withConversationId: function(account1Id, account2Id, callback) {
			this.getConversation(account1Id, account2Id, bind(this, function(err, conversation) {
				if (err) { return callback(err) }
				if (conversation) {
					callback(null, conversation.id)
				} else {
					this._createConversationId(account1Id, account2Id, callback)
				}
			}))
		},
		_createConversationId: function(account1Id, account2Id, callback) {
			try { var ids = this._orderConvoIds(account1Id, account2Id) }
			catch (err) { return callback(err) }
			this.db.transact(this, function(tx) {
				callback = txCallback(tx, callback)
				this._insertConversation(tx, ids, function(err, convoId) {
					if (err) { return callback(err) }
					this._insertParticipation(tx, convoId, ids.account1Id, function(err) {
						if (err) { return callback(err) }
						this._insertParticipation(tx, convoId, ids.account2Id, function(err) {
							if (err) { return callback(err) }
							callback(null, convoId)
						})
					})
				})
			})
		},
		_createMessage: function(accountId, toAccountId, conversationId, body, callback) {
			this.db.transact(this, function(tx) {
				callback = txCallback(tx, callback)
				this._insertMessage(tx, accountId, conversationId, body, function(err, messageId) {
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
			conn.insert(this,
				'INSERT INTO conversation SET created_time=?, account_1_id=?, account_2_id=?',
				[conn.time(), ids.account1Id, ids.account2Id], callback)
		},
		_insertParticipation: function(conn, convoId, accountId, callback) {
			conn.insert(this,
				'INSERT INTO conversation_participation SET conversation_id=?, account_id=?',
				[convoId, accountId], callback)
		},
		_insertMessage: function(conn, accountId, convoId, body, callback) {
			conn.insert(this,
				'INSERT INTO message SET sent_time=?, sender_account_id=?, conversation_id=?, body=?',
				[conn.time(), accountId, convoId, body], callback)
		},
		_selectMessage: function(conn, messageId, callback) {
			conn.selectOne(this, this.sql.selectMessage+' WHERE id=?', [messageId], callback)
		},
		_selectMessages: function(conn, convoId, callback) {
			conn.select(this, this.sql.selectMessage+' WHERE conversation_id=? ORDER BY id DESC', [convoId], callback)
		},
		_selectParticipations: function(conn, accountId, callback) {
			conn.select(this, this.sql.selectParticipation
				+ 'WHERE partic.account_id=?\n'
				+ 'ORDER BY last_received.sent_time DESC, convo.created_time DESC', [accountId], callback)
		},
		_selectConversation: function(conn, account1Id, account2Id, callback) {
			conn.selectOne(this, 'SELECT * FROM conversation WHERE account_1_id=? AND account_2_id=?', [account1Id, account2Id], callback)
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
				id:'id',
				senderAccountId:'sender_account_id',
				conversationId:'conversation_id',
				sentTime:'sent_time',
				body:'body'
			}),
			
			selectConvo:sql.selectFrom('conversation', {
				id:'id',
				account1Id:'account_1_id',
				account2Id:'account_2_id',
				createdTime: 'created_time',
				lastMessageId: 'last_messageId'
			}),
			
			selectParticipation:sql.selectFrom('conversation_participation partic', {
				account1Id: 'convo.account_1_id',
				account2Id: 'convo.account_2_id',
				conversationId: 'partic.conversation_id',
				lastReceivedBody: 'last_received.body',
				lastReceivedTime: 'last_received.sent_time',
				lastReceivedMessageId: 'last_received.id',
				lastReadMessageId: 'partic.last_read_message_id',
				// TODO Remove lastMessage*
				lastMessageBody: 'last_message.body',
				lastMessageTime: 'last_message.sent_time',
				lastMessageFromId: 'last_message.sender_account_id'
			})
			+ 'INNER JOIN conversation convo ON partic.conversation_id=convo.id\n'
			+ 'LEFT OUTER JOIN message last_message ON convo.last_message_id=last_message.id\n'
			+ 'LEFT OUTER JOIN message last_received ON partic.last_received_message_id=last_received.id\n'
			// TODO remove last_message join
		}
	}
)
