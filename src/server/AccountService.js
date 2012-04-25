var uuid = require('uuid'),
	facebook = require('./util/facebook'),
	sql = require('./util/sql')

module.exports = proto(null,
	function(database) {
		this.db = database
	}, {
		lookupOrCreateByFacebookAccount:function(fbAccount, fbAccessToken, callback) {
			this._selectAccountByFacebookId(this.db, fbAccount.id, function(err, account) {
				if (err) { return callback(err) }
				if (account && account.claimed_time) { return callback(null, account) }
				
				facebook.get('me/friends', { access_token:fbAccessToken }, bind(this, function(err, res) {
					if (err) { return callback(err) }
					var fbFriends = res.data
					if (res.error || !fbFriends) {
						callback(res.error || 'Facebook connect failed')
					} else if (account) {
						this._claimAccount(fbAccount, fbFriends, callback)
					} else {
						this._createClaimedAccount(fbAccount, fbFriends, callback)
					}
				}))
			})
		},
		withFacebookContactId:function(accountId, contactFbAccountId, callback) {
			this._selectFacebookContact(this.db, accountId, contactFbAccountId, function(err, fbContact) {
				if (err) { return callback(err) }
				var accountFbId = fbContact.contact_facebook_id
				this._selectAccountByFacebookId(this.db, accountFbId, function(err, acc) {
					if (err) { return callback(err) }
					if (acc) { return callback(null, acc.id) }
					this._insertUnclaimedAccount(this.db, accountFbId, fbContact.contact_facebook_name, callback)
				})
			})
		},
		getAccount: function(accountId, callback) {
			this._selectAccount(this.db, accountId, callback)
		},
		getContacts: function(accountId, callback) {
			this._selectContacts(this.db, accountId, function(err, contacts) {
				if (err) { return callback(err) }
				callback(null, { contacts:contacts })
			})
		},
		_createClaimedAccount:function(fbAccount, fbFriends, callback) {
			console.log('create new account with', fbFriends.length, 'friends')
			this.db.transact(this, function(tx) {
				callback = txCallback(tx, callback)
				this._insertClaimedAccount(tx, fbAccount, bind(this, this._insertFbContacts, tx, fbFriends, callback))
			})
		},
		_claimAccount:function(fbAccount, fbFriends, callback) {
			console.log('claim account with', fbFriends.length, 'friends')
			this.db.transact(this, function(tx) {
				callback = txCallback(tx, callback)
				this._updateAccountClaimed(tx, fbAccount, bind(this, this._insertFbContacts, tx, fbFriends, callback))
			})
		},
		_insertFbContacts:function(tx, fbFriends, callback, err, accountId) {
			if (err) { return callback(err) }
			var next = bind(this, function(err) {
				if (err) { return callback(err) }
				if (!fbFriends.length) { return finish(accountId) }
				var friend = fbFriends.shift()
				this._insertFacebookContact(tx, accountId, friend.id, friend.name, next)
			})
			var finish = bind(this, function(accountId) {
				this._selectAccount(tx, accountId, callback)
			})
			next()
		},
		_insertClaimedAccount: function(conn, fbAccount, callback) {
			conn.insert(this,
				'INSERT INTO account SET created_time=?, claimed_time=?, facebook_id=?, full_name=?, gender=?, locale=?',
				[conn.time(), conn.time(), fbAccount.id, fbAccount.name, fbAccount.gender, fbAccount.locale], callback)
		},
		_updateAccountClaimed: function(conn, fbAccount, callback) {
			conn.updateOne(this,
				'UPDATE account SET claimed_time=?, full_name=?, gender=?, locale=?',
				[conn.time(), fbAccount.name, fbAccount.gender, fbAccount.locale], callback)
		},
		_insertUnclaimedAccount: function(conn, fbAccountId, name, callback) {
			conn.updateOne(this,
				'INSERT INTO account SET created_time=?, facebook_id=?, full_name=?',
				[conn.time(), fbAccountId, name], callback)
		},
		_insertFacebookContact: function(conn, accountId, fbContactFbAccountId, fbContactName, callback) {
			conn.insert(this,
				'INSERT INTO facebook_contact SET account_id=?, contact_facebook_id=?, contact_facebook_name=?',
				[accountId, fbContactFbAccountId, fbContactName], callback)
		},
		_selectFacebookContact: function(conn, accountId, fbContactFbAccountId, callback) {
			conn.selectOne(this,
				'SELECT * FROM facebook_contact WHERE account_id=? AND contact_facebook_id=?',
				[accountId, fbContactFbAccountId], callback)
		},
		_selectContacts: function(conn, accountId, callback) {
			var properties = {
				accountId: 'dg.id',
				facebookId: 'fc.contact_facebook_id',
				fullName: 'fc.contact_facebook_name',
				memberSince: 'dg.claimed_time'
			}
			conn.select(this,
				'SELECT'+sql.joinProperties(properties)+'FROM facebook_contact fc\n'+
				'LEFT OUTER JOIN account dg ON fc.contact_facebook_id=dg.facebook_id\n'+
				'WHERE fc.account_id=?', [accountId], callback)
		},
		_selectAccountByFacebookId: function(conn, fbAccountId, callback) {
			conn.selectOne(this, 'SELECT * FROM account WHERE facebook_id=?', [fbAccountId], callback)
		},
		_selectAccount: function(conn, accountId, callback) {
			conn.selectOne(this, 'SELECT * FROM account WHERE id=?', [accountId], callback)
		}
	}
)
