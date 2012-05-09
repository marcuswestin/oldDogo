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
				if (account && account.memberSince) { return callback(null, account) }
				
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
				if (!fbContact) { return callback('Facebook contact not found') }
				var accountFbId = fbContact.facebookId
				this._selectAccountByFacebookId(this.db, fbContact.facebookId, function(err, acc) {
					if (err) { return callback(err) }
					if (acc) { return callback(null, acc.accountId) }
					this._insertUnclaimedAccount(this.db, fbContact.facebookId, fbContact.name, callback)
				})
			})
		},
		getAccount: function(accountId, callback) {
			this._selectAccount(this.db, accountId, callback)
		},
		getContacts: function(accountId, callback) {
			this._selectContacts(this.db, accountId, callback)
		},
		setPushAuth: function(accountId, pushToken, pushSystem, callback) {
			this._updateAccountPushAuth(this.db, accountId, pushToken, pushSystem, callback)
		},
		_createClaimedAccount:function(fbAccount, fbFriends, callback) {
			console.log('create new account with', fbFriends.length, 'friends')
			this.db.transact(this, function(tx) {
				callback = txCallback(tx, callback)
				this._insertClaimedAccount(tx, fbAccount, bind(this, this._insertFbContacts, tx, fbAccount, fbFriends, callback))
			})
		},
		_claimAccount:function(fbAccount, fbFriends, callback) {
			console.log('claim account with', fbAccount, fbFriends.length, 'friends')
			this.db.transact(this, function(tx) {
				callback = txCallback(tx, callback)
				this._updateAccountClaimed(tx, fbAccount, bind(this, this._insertFbContacts, tx, fbAccount, fbFriends, callback))
			})
		},
		_insertFbContacts:function(tx, fbAccount, fbFriends, callback, err) {
			var accountId = null
			if (err) { return logErr(err, callback, '_insertFbContacts', accountId) }
			var next = bind(this, function(err) {
				if (err) { return callback(err) }
				if (!fbFriends.length) { return finish() }
				var friend = fbFriends.shift()
				this._insertFacebookContact(tx, accountId, friend.id, friend.name, next)
			})
			var finish = bind(this, function() {
				this._selectAccount(tx, accountId, callback)
			})
			this._selectAccountByFacebookId(tx, fbAccount.id, function(err, account) {
				if (err) { return logErr(err, callback, 'select id by facebook id', fbAccount) }
				accountId = account.accountId
				if (!accountId) { return callback("No Dogo account matches this Facebook account") }
				next()
			})
		},
		_insertClaimedAccount: function(conn, fbAccount, callback) {
			conn.insert(this,
				'INSERT INTO account SET created_time=?, claimed_time=?, facebook_id=?, full_name=?, gender=?, locale=?',
				[conn.time(), conn.time(), fbAccount.id, fbAccount.name, fbAccount.gender, fbAccount.locale], callback)
		},
		_updateAccountClaimed: function(conn, fbAccount, callback) {
			conn.updateOne(this,
				'UPDATE account SET claimed_time=?, full_name=?, gender=?, locale=? WHERE facebook_id=?',
				[conn.time(), fbAccount.name, fbAccount.gender, fbAccount.locale, fbAccount.id], callback)
		},
		_updateAccountPushAuth: function(conn, accountId, pushToken, pushSystem, callback) {
			conn.updateOne(this,
				'UPDATE account SET push_token=?, push_system=? WHERE id=?',
				[pushToken, pushSystem, accountId], callback)
		},
		_insertUnclaimedAccount: function(conn, fbAccountId, name, callback) {
			conn.insert(this,
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
				this.sql.selectFacebookContact+'WHERE account_id=? AND contact_facebook_id=?',
				[accountId, fbContactFbAccountId], callback)
		},
		_selectContacts: function(conn, accountId, callback) {
			conn.select(this, this.sql.contact+'WHERE facebook_contact.account_id=?', [accountId], callback)
		},
		_selectAccountByFacebookId: function(conn, fbAccountId, callback) {
			conn.selectOne(this, this.sql.account+'WHERE facebook_id=?', [fbAccountId], callback)
		},
		_selectAccount: function(conn, accountId, callback) {
			conn.selectOne(this, this.sql.account+'WHERE id=?', [accountId], callback)
		},
		sql: {
			selectFacebookContact: sql.selectFrom('facebook_contact', {
				facebookId:'contact_facebook_id',
				name:'contact_facebook_name'
			}),
			account: sql.selectFrom('account', {
				facebookId:'facebook_id',
				name:'full_name',
				accountId:'id',
				pushToken:'push_token',
				memberSince:'claimed_time'
			}),
			contact: sql.selectFrom('facebook_contact', {
				accountId: 'account.id',
				facebookId: 'facebook_contact.contact_facebook_id',
				fullName: 'facebook_contact.contact_facebook_name',
				name: 'facebook_contact.contact_facebook_name',
				memberSince: 'account.claimed_time'
			}) + 'LEFT OUTER JOIN account ON facebook_contact.contact_facebook_id=account.facebook_id\n'
		}
	}
)
