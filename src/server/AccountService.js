var uuid = require('uuid')
var facebook = require('./util/facebook')
var sql = require('./util/sql')
var orderConversationIds = require('./util/ids').orderConversationIds


var clientUidBlockSize = 100000

module.exports = proto(null,
	function(database) {
		this.db = database
	}, {
		lookupOrCreateByFacebookAccount:function(req, fbAccount, fbAccessToken, callback) {
			req.timer.start('_selectAccountByFacebookId')
			this._selectAccountByFacebookId(this.db, fbAccount.id, function(err, account) {
				req.timer.stop('_selectAccountByFacebookId')
				if (err) { return callback(err) }
				
				req.timer.start('get /me/friends from facebook')
				facebook.get('/me/friends', { access_token:fbAccessToken }, bind(this, function(err, res) {
					req.timer.stop('get /me/friends from facebook')
					if (err) { return callback(err) }
					var fbFriends = res.data
					if (res.error || !fbFriends) {
						callback(res.error || 'Facebook connect me/friends failed')
					} else if (account && account.memberSince) {
						this._insertFbContacts(req, this.db, fbAccount, fbFriends, callback)
					} else if (account) {
						this._claimAccount(req, account, fbAccount, fbFriends, callback)
					} else {
						this._createClaimedAccount(req, fbAccount, fbFriends, callback)
					}
				}))
			})
		},
		lookupOrCreateByEmail:function(emailAddress, callback) {
			if (!emailAddress) { return callback('Missing email address') }
			this.db.transact(this, function(tx) {
				callback = tx.wrapCallback(callback)
				tx.selectOne(this, 'SELECT account_id as accountId FROM account_email WHERE email_address=?', [emailAddress], function(err, res) {
					if (err) { return callback(err) }
					if (res && res.accountId) {
						this._selectAccountByAccountId(tx, res.accountId, callback)
					} else {
						tx.insert(this, 'INSERT INTO account SET created_time=?', [tx.time()], function(err, accountId) {
							if (err) { return callback(err) }
							tx.insert(this,
								'INSERT INTO account_email SET email_address=?, account_id=?, created_time=?',
								[emailAddress, accountId, tx.time()], function(err, accountEmailId) {
									this._selectAccountByAccountId(tx, accountId, callback)
								}
							)
						})
					}
				})
			})
		},
		// withFacebookContactId:function(accountId, contactFbAccountId, callback) {
		// 	this._selectFacebookContact(this.db, accountId, contactFbAccountId, function(err, fbContact) {
		// 		if (err) { return callback(err) }
		// 		if (!fbContact) { return callback('Facebook contact not found') }
		// 		var accountFbId = fbContact.facebookId
		// 		this._selectAccountByFacebookId(this.db, fbContact.facebookId, function(err, acc) {
		// 			if (err) { return callback(err) }
		// 			if (acc) { return callback(null, acc.accountId) }
		// 			this._insertUnclaimedAccount(this.db, fbContact.facebookId, fbContact.name, callback)
		// 		})
		// 	})
		// },
		getAccount: function(accountId, facebookId, callback) {
			if (accountId) {
				this._selectAccountByAccountId(this.db, accountId, callback)
			} else {
				this._selectAccountByFacebookId(this.db, facebookId, callback)
			}
		},
		setPushAuth: function(accountId, pushToken, pushSystem, callback) {
			this._updateAccountPushAuth(this.db, accountId, pushToken, pushSystem, callback)
		},
		bumpClientUidBlock: function(accountId, callback) {
			this.db.transact(this, function(tx) {
				callback = tx.wrapCallback(callback)
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
			conn.selectOne(this, 'SELECT last_client_uid_block_start AS start, last_client_uid_block_end AS end FROM account WHERE id=?',
				[accountId], callback)
		},
		_updateClientUidBlock:function(conn, accountId, clientUidBlock, callback) {
			conn.updateOne(this, 'UPDATE account SET last_client_uid_block_start=?, last_client_uid_block_end=? WHERE id=?',
				[clientUidBlock.start, clientUidBlock.end, accountId], callback)
		},
		_createClaimedAccount:function(req, fbAcc, fbFriends, callback) {
			log('create new account with', fbFriends.length, 'friends')
			this.db.transact(this, function(tx) {
				callback = tx.wrapCallback(callback)
				var emailVerifiedTime = fbAcc.email ? tx.time() : null
				fbAcc.email, emailVerifiedTime
				
				tx.insert(this,
					'INSERT INTO account SET created_time=?, claimed_time=?, facebook_id=?, full_name=?, first_name=?, last_name=?, gender=?, locale=?, timezone=?',
					[tx.time(), tx.time(), fbAcc.id, fbAcc.name, fbAcc.first_name, fbAcc.last_name, fbAcc.gender, fbAcc.locale, fbAcc.timezone],
					function(err, accountId) {
						if (err) { return callback(err) }
						this._addFacebookEmail(req, tx, accountId, fbAcc, function() {
							this._insertFbContacts(req, tx, fbAcc, fbFriends, callback)
						})
					}
				)
			})
		},
		_claimAccount:function(req, account, fbAcc, fbFriends, callback) {
			log('claim account with', fbAcc, fbFriends.length, 'friends')
			req.timer.start('_claimAccount')
			this.db.transact(this, function(tx) {
				callback = tx.wrapCallback(callback)
				var emailVerifiedTime = fbAcc.email ? tx.time() : null
				// Insert email ignore
				tx.updateOne(this,
					'UPDATE account SET claimed_time=?, full_name=?, first_name=?, last_name=?, gender=?, locale=?, timezone=? WHERE facebook_id=? AND id=?',
					[tx.time(), fbAcc.name, fbAcc.first_name, fbAcc.last_name, fbAcc.gender, fbAcc.locale, fbAcc.timezone, fbAcc.id, account.id],
					function(err) {
						if (err) { return callback(err) }
						this._addFacebookEmail(req, tx, account.id, fbAcc, function() {
							req.timer.stop('_claimAccount')
							this._insertFbContacts(req, tx, fbAcc, fbFriends, callback)
						})
					}
				)
			})
		},
		_addFacebookEmail:function(req, conn, accountId, fbAcc, callback) {
			req.timer.start('_addFacebookEmail')
			if (fbAcc.email && !fbAcc.email.match('proxymail.facebook.com')) {
				conn.insert(this,
					'INSERT INTO account_email SET account_id=?, email_address=?, created_time=?, claimed_time=?',
					[accountId, fbAcc.email, conn.time(), conn.time()], function(err) {
						if (err) { console.log("WARNING _addFacebookEmail failed", err, accountId, fbAcc) }
						req.timer.stop('_addFacebookEmail')
						callback.call(this)
					}
				)
			} else {
				req.timer.stop('_addFacebookEmail')
				callback.call(this)
			}
		},
		_insertFbContacts:function(req, tx, fbAccount, fbFriends, callback, err) {
			if (err) { return logErr(err, callback, '_insertFbContacts', fbAccount) }
			req.timer.start('_insertFbContacts')
			this._selectAccountByFacebookId(tx, fbAccount.id, function(err, userAccount) {
				if (err) { return logErr(err, callback, 'select id by facebook id', fbAccount) }
				var timestamp = tx.time()
				ensureAccountsExist.call(this)
				
				function ensureAccountsExist() {
					serialMap(fbFriends, {
						context:this,
						filterNulls:true,
						iterate: function(friend, next) {
							tx.selectOne(this, 'SELECT id FROM account WHERE facebook_id=?', [friend.id], function(err, friendAccount) {
								if (err) { return next(err) }
								if (friendAccount) { return next(null, friendAccount.id) }
								this._createUnclaimedAccountForFacebookFriend(tx, friend.id, friend.name, next)
							})
						},
						finish: function(err, friendAccountIds) {
							if (err) { return callback(err) }
							req.timer.stop('_insertFbContacts')
							createConversations.call(this, friendAccountIds)
						}
					})
				}
				
				function createConversations(friendAccountIds) {
					serialMap(friendAccountIds, {
						context:this,
						iterate:function(friendAccountId, next) {
							try { var ids = orderConversationIds(userAccount.accountId, friendAccountId) }
							catch(e) { return next(e) }
							tx.selectOne(this, 'SELECT id FROM conversation WHERE account_1_id=? AND account_2_id=?', [ids.account1Id, ids.account2Id], function(err, conv) {
								if (err) { return next(err) }
								if (conv) { return next(null, { conversationId:conv.id, ids:ids }) }
								tx.insert(this, 'INSERT INTO conversation SET account_1_id=?, account_2_id=?, created_time=?',
									[ids.account1Id, ids.account2Id, timestamp], function(err, convId) {
										if (err) { return next(err) }
										next(null, { conversationId:convId, ids:ids })
									}
								)
							})
						},
						finish:function(err, conversationInfos) {
							if (err) { return callback(err) }
							createConversationParticipations.call(this, conversationInfos)
						}
					})
				}
				
				function createConversationParticipations(conversationInfos) {
					serialMap(conversationInfos, {
						context:this,
						iterate:function(convInfo, next) {
							var waiting = waitFor(2, next)
							each(convInfo.ids, function(accountId) {
								tx.insertIgnoreDuplicateEntry(this, 'INSERT INTO conversation_participation SET account_id=?, conversation_id=?',
									[accountId, convInfo.conversationId], waiting
								)
							})
						},
						finish:function(err, res) {
							if (err) { return callback(err) }
							callback(null, userAccount)
						}
					})
				}
			})
		},
		_updateAccountPushAuth: function(conn, accountId, pushToken, pushSystem, callback) {
			conn.updateOne(this,
				'UPDATE account SET push_token=?, push_system=? WHERE id=?',
				[pushToken, pushSystem, accountId], callback)
		},
		_createUnclaimedAccountForFacebookFriend: function(conn, fbAccountId, name, callback) {
			conn.insert(this,
				'INSERT INTO account SET created_time=?, facebook_id=?, full_name=?',
				[conn.time(), fbAccountId, name], callback)
		},
		// _selectFacebookContact: function(conn, accountId, fbContactFbAccountId, callback) {
		// 	conn.selectOne(this,
		// 		this.sql.selectFacebookContact+'WHERE account_id=? AND contact_facebook_id=?',
		// 		[accountId, fbContactFbAccountId], callback)
		// },
		_selectAccountByFacebookId: function(conn, fbAccountId, callback) {
			conn.selectOne(this, this.sql.account+'WHERE facebook_id=?', [fbAccountId], callback)
		},
		_selectAccountByAccountId: function(conn, accountId, callback) {
			conn.selectOne(this, this.sql.account+'WHERE id=?', [accountId], callback)
		},
		sql: {
			// selectFacebookContact: sql.selectFrom('facebook_contact', {
			// 	facebookId:'contact_facebook_id',
			// 	name:'contact_facebook_name'
			// }),
			account: sql.selectFrom('account', {
				facebookId:'facebook_id',
				name:'full_name',
				firstName:'first_name',
				lastName:'last_name',
				accountId:'id',
				id:'id',
				pushToken:'push_token',
				memberSince:'claimed_time',
				waitlistedTime:'waitlisted_time'
			})
			// contact: sql.selectFrom('facebook_contact', {
			// 	accountId: 'account.id',
			// 	facebookId: 'facebook_contact.contact_facebook_id',
			// 	fullName: 'facebook_contact.contact_facebook_name',
			// 	name: 'facebook_contact.contact_facebook_name',
			// 	memberSince: 'account.claimed_time'
			// }) + 'LEFT OUTER JOIN account ON facebook_contact.contact_facebook_id=account.facebook_id\n'
		}
	}
)


function waitFor(num, callback) {
	var error
	return function(err, res) {
		if (num == 0) { return log.warn("waitFor was called more than the expected number of times") }
		if (error) { return }
		if (err) {
			error = err
			return callback(err)
		}
		num -= 1
		if (num == 0) { callback(null) }
	}
}
