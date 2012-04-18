var Message = require('../data/Message')

module.exports = proto(null,
	function(database, accountService) {
		this.db = database
		this.accountService = accountService
	}, {
		createConversation: function(accountId, contactFbAccountId, callback) {
			this.accountService.withFacebookContact(accountId, contactFbAccountId, bind(this, function(err, contactAccountId) {
				if (err) { return callback(err) }
				this._createConversation(accountId, contactAccountId, callback)
			}))
		},
		_createConversation: function(account1Id, account2Id, callback) {
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
							this._selectConversation(tx, convoId, callback)
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
		_selectConversation: function(conn, convoId, callback) {
			conn.selectOne(this, 'SELECT * FROM conversation WHERE id=?', [convoId], callback)
		}
	}
)
