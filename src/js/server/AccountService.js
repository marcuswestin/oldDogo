var uuid = require('uuid')
var facebook = require('./util/facebook')
var sql = require('./util/sql')
var orderConversationIds = require('./util/ids').orderConversationIds
var waitFor = require('std/waitFor')

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
				tx.selectOne(this, 'SELECT account_id as dogoId FROM account_email WHERE email_address=?', [emailAddress], function(err, res) {
					if (err) { return callback(err) }
					if (res && res.dogoId) {
						this._selectAccountByAccountId(tx, res.dogoId, callback)
					} else {
						tx.insert(this, 'INSERT INTO account SET created_time=?', [tx.time()], function(err, dogoId) {
							if (err) { return callback(err) }
							tx.insert(this,
								'INSERT INTO account_email SET email_address=?, account_id=?, created_time=?',
								[emailAddress, dogoId, tx.time()], function(err, accountEmailId) {
									this._selectAccountByAccountId(tx, dogoId, callback)
								}
							)
						})
					}
				})
			})
		},
		getAccount: function(dogoId, facebookId, callback) {
			if (dogoId) {
				this._selectAccountByAccountId(this.db, dogoId, callback)
			} else {
				this._selectAccountByFacebookId(this.db, facebookId, callback)
			}
		},
		setPushAuth: function(dogoId, pushToken, pushSystem, callback) {
			this._updateAccountPushAuth(this.db, dogoId, pushToken, pushSystem, callback)
		},
		bumpClientUidBlock: function(dogoId, callback) {
			this.db.transact(this, function(tx) {
				callback = tx.wrapCallback(callback)
				this._selectClientUidBlock(tx, dogoId, function(err, clientUidBlock) {
					if (err) { return callback(err) }
					clientUidBlock.start += clientUidBlockSize
					clientUidBlock.end += clientUidBlockSize
					this._updateClientUidBlock(tx, dogoId, clientUidBlock, function(err) {
						if (err) { return callback(err) }
						callback(null, clientUidBlock)
					})
				})
			})
		},
		_selectClientUidBlock:function(conn, dogoId, callback) {
			conn.selectOne(this, 'SELECT last_client_uid_block_start AS start, last_client_uid_block_end AS end FROM account WHERE id=?',
				[dogoId], callback)
		},
		_updateClientUidBlock:function(conn, dogoId, clientUidBlock, callback) {
			conn.updateOne(this, 'UPDATE account SET last_client_uid_block_start=?, last_client_uid_block_end=? WHERE id=?',
				[clientUidBlock.start, clientUidBlock.end, dogoId], callback)
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
					function(err, dogoId) {
						if (err) { return callback(err) }
						this._addFacebookEmail(req, tx, dogoId, fbAcc, function() {
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
		_addFacebookEmail:function(req, conn, dogoId, fbAcc, callback) {
			req.timer.start('_addFacebookEmail')
			if (fbAcc.email && !fbAcc.email.match('proxymail.facebook.com')) {
				conn.insert(this,
					'INSERT INTO account_email SET account_id=?, email_address=?, created_time=?, claimed_time=?',
					[dogoId, fbAcc.email, conn.time(), conn.time()], function(err) {
						if (err) { console.log("WARNING _addFacebookEmail failed", err, dogoId, fbAcc) }
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
						iterate: function(fbFriend, next) {
							tx.selectOne(this, 'SELECT id FROM account WHERE facebook_id=?', [fbFriend.id], function(err, dogoFriend) {
								if (err) { return next(err) }
								if (dogoFriend) {
									next(null, { dogoId:dogoFriend.id, facebookId:fbFriend.id, name:fbFriend.name })
								} else {
									this._createUnclaimedAccountForFacebookFriend(tx, fbFriend.id, fbFriend.name, function(err, dogoId) {
										next(err, err ? null : { dogoId:dogoId, facebookId:fbFriend.id, name:fbFriend.name })
									})
								}
							})
						},
						finish: function(err, friends) {
							if (err) { return callback(err) }
							req.timer.stop('_insertFbContacts')
							createConversations.call(this, friends)
						}
					})
				}
				
				function createConversations(friends) {
					serialMap(friends, {
						context:this,
						iterate:function(friend, next) {
							try { var ids = orderConversationIds(userAccount.dogoId, friend.dogoId) }
							catch(e) { return next(e) }
							tx.selectOne(this, 'SELECT id FROM conversation WHERE account_1_id=? AND account_2_id=?',
								[ids.account1Id, ids.account2Id],
								function(err, conv) {
								if (err) { return next(err) }
								if (conv) { return next() }
								tx.insert(this, 'INSERT INTO conversation SET account_1_id=?, account_2_id=?, created_time=?',
									[ids.account1Id, ids.account2Id, timestamp], function(err, convId) {
										if (err) { return next(err) }
										var waiting = waitFor(2, next)
										var summaryISee = {
											people:[{ dogoId:friend.dogoId, facebookId:friend.facebookId, name:friend.name }]
										}
										var summaryFriendSees = {
											people:[{ dogoId:userAccount.dogoId, facebookId:userAccount.facebookId, name:userAccount.name }]
										}
										each(ids, function(dogoId) {
											var summary = (dogoId == userAccount.dogoId ? summaryISee : summaryFriendSees)
											tx.insertIgnoreDuplicateEntry(this,
												'INSERT INTO conversation_participation SET account_id=?, conversation_id=?, summaryJson=?',
												[dogoId, convId, JSON.stringify(summary)],
												waiting
											)
										})
									}
								)
							})
						},
						finish:function(err, conversationInfos) {
							callback(err, err ? null : userAccount)
						}
					})
				}
			})
		},
		_updateAccountPushAuth: function(conn, dogoId, pushToken, pushSystem, callback) {
			conn.updateOne(this,
				'UPDATE account SET push_token=?, push_system=? WHERE id=?',
				[pushToken, pushSystem, dogoId], callback)
		},
		_createUnclaimedAccountForFacebookFriend: function(conn, fbAccountId, name, callback) {
			conn.insert(this,
				'INSERT INTO account SET created_time=?, facebook_id=?, full_name=?',
				[conn.time(), fbAccountId, name], callback)
		},
		_selectAccountByFacebookId: function(conn, fbAccountId, callback) {
			conn.selectOne(this, this.sql.account+'WHERE facebook_id=?', [fbAccountId], callback)
		},
		_selectAccountByAccountId: function(conn, dogoId, callback) {
			conn.selectOne(this, this.sql.account+'WHERE id=?', [dogoId], callback)
		},
		sql: {
			account: sql.selectFrom('account', {
				facebookId:'facebook_id',
				name:'full_name',
				firstName:'first_name',
				lastName:'last_name',
				dogoId:'id',
				id:'id',
				pushToken:'push_token',
				memberSince:'claimed_time',
				waitlistedTime:'waitlisted_time'
			})
		}
	}
)
