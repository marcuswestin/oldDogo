var trim = require('std/trim')

module.exports = proto(null,
	function(database, accountService) {
		this.db = database
		this.accountService = accountService
	}, {
		listConversations: function(accountId, callback) {
			this._selectParticipations(this.db, accountId, function(err, conversations) {
				if (err) { return callback(err) }
				for (var i=0, convo; convo=conversations[i]; i++) {
					var acc1 = convo.account1Id,
						acc2 = convo.account2Id
					convo.withAccountId = (acc1 == accountId ? acc2 : acc1)
				}
				callback(null, { conversations:conversations })
			})
		},
		sendMessage: function(accountId, toFacebookAccountId, toAccountId, body, callback) {
			body = trim(body)
			if (!body) { return callback('Empty body') }
			this._withContactAccountId(accountId, toFacebookAccountId, toAccountId, function(err, toAccountId) {
				if (err) { return callback(err) }
				this.withConversationId(accountId, toAccountId, bind(this, function(err, conversationId) {
					this._createMessage(accountId, conversationId, body, bind(this, function(err, message) {
						if (err) { return callback(err) }
						console.log("TODO Send message push to", toAccountId)
						callback(null, { message:message })
					}))
				}))
			})
		},
		getMessages: function(accountId, withFacebookId, withAccountId, callback) {
			this._withContactAccountId(accountId, withFacebookId, withAccountId, function(err, withAccountId) {
				if (err) { return callback(err) }
				this.withConversationId(accountId, withAccountId, bind(this, function(err, conversationId) {
					if (err) { return callback(err) }
					this._selectMessages(this.db, conversationId, bind(this, function(err, messages) {
						if (err) { return callback(err) }
						callback(null, { messages:messages })
					}))
				}))
			})
		},
		_withContactAccountId: function(accountId, contactFacebookId, contactAccountId, callback) {
			if (contactAccountId) {
				callback.call(this, null, contactAccountId)
			} else {
				this.accountService.withFacebookContactId(accountId, contactFacebookId, bind(this, callback))
			}
		},
		withConversationId: function(account1Id, account2Id, callback) {
			try { var ids = this._orderConvoIds(account1Id, account2Id) }
			catch (err) { return callback(err) }
			this._selectConversation(this.db, ids.account_1_id, ids.account_2_id, function(err, conversation) {
				if (err) { return callback(err) }
				if (conversation) { return callback(null, conversation.id) }
				this._createConversationId(account1Id, account2Id, callback)
			})
		},
		_createConversationId: function(account1Id, account2Id, callback) {
			try { var ids = this._orderConvoIds(account1Id, account2Id) }
			catch (err) { return callback(err) }
			this.db.transact(this, function(tx) {
				callback = txCallback(tx, callback)
				this._insertConversation(tx, ids, function(err, convoId) {
					if (err) { return callback(err) }
					this._insertParticipation(tx, convoId, ids.account_1_id, function(err) {
						if (err) { return callback(err) }
						this._insertParticipation(tx, convoId, ids.account_2_id, function(err) {
							if (err) { return callback(err) }
							callback(null, convoId)
						})
					})
				})
			})
		},
		_createMessage: function(accountId, conversationId, body, callback) {
			this.db.transact(this, function(tx) {
				callback = txCallback(tx, callback)
				this._insertMessage(tx, accountId, conversationId, body, function(err, messageId) {
					if (err) { return callback(err) }
					this._updateConversationLastMessage(tx, conversationId, messageId, function(err) {
						if (err) { return callback(err) }
						this._selectMessage(tx, messageId, callback)
					})
				})
			})
		},
		_orderConvoIds: function(id1, id2) {
			if (typeof id1 == 'string') { id1 = parseInt(id1, 10) }
			if (typeof id2 == 'string') { id2 = parseInt(id2, 10) }
			if ((typeof id1 != 'number') || (typeof id2 != 'number')) { throw new Error('Bad id') }
			return id1 < id2
				? { account_1_id:id1, account_2_id:id2 }
				: { account_1_id:id2, account_2_id:id1 }
		},
		_insertConversation: function(conn, ids, callback) {
			conn.insert(this,
				'INSERT INTO conversation SET created_time=?, account_1_id=?, account_2_id=?',
				[conn.time(), ids.account_1_id, ids.account_2_id], callback)
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
			conn.selectOne(this, this.sql.message+' WHERE id=?', [messageId], callback)
		},
		_selectMessages: function(conn, convoId, callback) {
			conn.select(this, this.sql.message+' WHERE conversation_id=?', [convoId], callback)
		},
		_selectParticipations: function(conn, accountId, callback) {
			conn.select(this, this.sql.participation+'WHERE participation.account_id=? ORDER BY last_message_id DESC', [accountId], callback)
		},
		_selectConversation: function(conn, account1Id, account2Id, callback) {
			conn.selectOne(this, 'SELECT * FROM conversation WHERE account_1_id=? AND account_2_id=?', [account1Id, account2Id], callback)
		},
		_updateConversationLastMessage: function(conn, convoId, messageId, callback) {
			conn.updateOne(this, 'UPDATE conversation SET last_message_id=? WHERE id=?', [messageId, convoId], callback)
		},
		sql: {
			message:'SELECT * FROM message\n',
			participation:
				'SELECT c.account_1_id as account1Id, c.account_2_id as account2Id, participation.*, last_message.*\n'+
				'FROM conversation_participation participation\n'+
				'INNER JOIN conversation c ON participation.conversation_id=c.id\n'+
				'INNER JOIN message last_message ON c.last_message_id=last_message.id\n'
		}
	}
)
