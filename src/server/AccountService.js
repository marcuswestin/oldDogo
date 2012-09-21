var uuid = require('uuid'),
	facebook = require('./util/facebook'),
	sql = require('./util/sql')

var clientUidBlockSize = 100000

module.exports = proto(null,
	function(database) {
		this.db = database
	}, {
		lookupOrCreateByFacebookAccount:function(fbAccount, fbAccessToken, callback) {
			this._selectAccountByFacebookId(this.db, fbAccount.id, function(err, account) {
				if (err) { return callback(err) }
				
				facebook.get('me/friends', { access_token:fbAccessToken }, bind(this, function(err, res) {
					if (err) { return callback(err) }
					var fbFriends = res.data
					if (res.error || !fbFriends) {
						callback(res.error || 'Facebook connect failed')
					} else if (account && account.memberSince) {
						this._insertFbContacts(this.db, fbAccount, fbFriends, callback)
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
		getAccount: function(accountId, facebookId, callback) {
			if (accountId) {
				this._selectAccountByAccountId(this.db, accountId, callback)
			} else {
				this._selectAccountByFacebookId(this.db, facebookId, callback)
			}
		},
		getContacts: function(accountId, callback) {
			this._selectContacts(this.db, accountId, callback)
		},
		setPushAuth: function(accountId, pushToken, pushSystem, callback) {
			this._updateAccountPushAuth(this.db, accountId, pushToken, pushSystem, callback)
		},
		bumpClientUidBlock: function(accountId, callback) {
			this.db.transact(this, function(tx) {
				callback = txCallback(tx, callback)
				this._selectClientUidBlock(tx, accountId, function(err, clientUidBlock) {
					if (err) { return callback(err) }
					clientUidBlock.start += clientUidBlockSize
					clientUidBlock.end += clientUidBlockSize
					this._updateClientUidBlock(tx, accountId, clientUidBlock, function(err) {
						if (err) { return callback(err) }
						callback(null, clientUidBlock)
					})
				})
			})
		},
		_selectClientUidBlock:function(conn, accountId, callback) {
			conn.selectOne(this, 'SELECT last_client_uid_block_start AS start, client_uid_block_end AS end FROM account WHERE id=?',
				[accountId], callback)
		},
		_updateClientUidBlock:function(conn, accountId, clientUidBlock, callback) {
			conn.updateOne(this, 'UPDATE account SET last_client_uid_block_start=?, last_client_uid_block_end=? WHERE id=?',
				[clientUidBlock.start, clientUidBlock.end, accountId], callback)
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
			if (err) { return logErr(err, callback, '_insertFbContacts', accountId) }
			this._selectAccountByFacebookId(tx, fbAccount.id, function(err, account) {
				if (err) { return logErr(err, callback, 'select id by facebook id', fbAccount) }
				var accountId = account.accountId
				if (!accountId) { return callback("No Dogo account matches this Facebook account") }
				serialMap(fbFriends, {
					this:this,
					iterate: function(friend, next) {
						tx.insertIgnoreDuplicateEntry(this,
							'INSERT INTO facebook_contact SET account_id=?, contact_facebook_id=?, contact_facebook_name=?',
							[accountId, fbContactFbAccountId, fbContactName], next
						)
					},
					finish: function(err, res) {
						this._selectAccountByAccountId(tx, accountId, callback)
					}
				})
			})
		},
		_insertClaimedAccount: function(conn, fbAcc, callback) {
			var timestamp = conn.time()
			var emailVerifiedTime = fbAcc.email ? timestamp : null
			conn.insert(this,
				'INSERT INTO account SET created_time=?, claimed_time=?, facebook_id=?, full_name=?, first_name=?, last_name=?, gender=?, locale=?, timezone=?, email=?, email_verified_time=?',
				[timestamp, timestamp, fbAcc.id, fbAcc.name, fbAcc.first_name, fbAcc.last_name, fbAcc.gender, fbAcc.locale, fbAcc.timezone, fbAcc.email, emailVerifiedTime], callback)
		},
		_updateAccountClaimed: function(conn, fbAcc, callback) {
			var timestamp = conn.time()
			var emailVerifiedTime = fbAcc.email ? timestamp : null
			conn.updateOne(this,
				'UPDATE account SET claimed_time=?, full_name=?, first_name=?, last_name=?, gender=?, locale=?, timezone=?, email=?, email_verified_time=? WHERE facebook_id=?',
				[timestamp, fbAcc.name, fbAcc.first_name, fbAcc.last_name, fbAcc.gender, fbAcc.locale, fbAcc.timezone, fbAcc.email, emailVerifiedTime, fbAcc.id], callback)
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
		_selectAccountByAccountId: function(conn, accountId, callback) {
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
				firstName:'first_name',
				lastName:'last_name',
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
