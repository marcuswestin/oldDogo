var uuid = require('uuid')
var facebook = require('./util/facebook')
var orderConversationIds = require('./util/ids').orderConversationIds
var waitFor = require('std/waitFor')

var clientUidBlockSize = 100000

module.exports = proto(null,
	function(database) {
		this.db = database
	}, {
		lookupOrCreateByFacebookAccount:function(req, fbAccount, fbAccessToken, callback) {
			req.timer.start('_selectPersonByFacebookId')
			this._selectPersonByFacebookId(this.db, fbAccount.id, function(err, person) {
				req.timer.stop('_selectPersonByFacebookId')
				if (err) { return callback(err) }
				
				req.timer.start('get /me/friends from facebook')
				facebook.get('/me/friends', { access_token:fbAccessToken }, bind(this, function(err, res) {
					req.timer.stop('get /me/friends from facebook')
					if (err) { return callback(err) }
					var fbFriends = res.data
					if (res.error || !fbFriends) {
						callback(res.error || 'Facebook connect me/friends failed')
					} else if (person && person.memberSince) {
						this._insertFbContacts(req, this.db, fbAccount, fbFriends, callback)
					} else if (person) {
						this._claimAccount(req, person, fbAccount, fbFriends, callback)
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
				tx.selectOne(this, 'SELECT personId FROM personEmail WHERE emailAddress=?', [emailAddress], function(err, res) {
					if (err) { return callback(err) }
					if (res && res.personId) {
						this._selectPersonByPersonId(tx, res.personId, callback)
					} else {
						tx.insert(this, 'INSERT INTO person SET createdTime=?', [tx.time()], function(err, personId) {
							if (err) { return callback(err) }
							tx.insert(this,
								'INSERT INTO personEmail SET emailAddress=?, personId=?, createdTime=?',
								[emailAddress, personId, tx.time()], function(err, personEmailId) {
									this._selectPersonByPersonId(tx, personId, callback)
								}
							)
						})
					}
				})
			})
		},
		getPerson: function(personId, facebookId, callback) {
			if (personId) {
				this._selectPersonByPersonId(this.db, personId, callback)
			} else {
				this._selectPersonByFacebookId(this.db, facebookId, callback)
			}
		},
		setPushAuth: function(personId, pushToken, pushSystem, callback) {
			this._updatePersonPushAuth(this.db, personId, pushToken, pushSystem, callback)
		},
		bumpClientUidBlock: function(personId, callback) {
			this.db.transact(this, function(tx) {
				callback = tx.wrapCallback(callback)
				this._selectClientUidBlock(tx, personId, function(err, clientUidBlock) {
					if (err) { return callback(err) }
					clientUidBlock.start += clientUidBlockSize
					clientUidBlock.end += clientUidBlockSize
					this._updateClientUidBlock(tx, personId, clientUidBlock, function(err) {
						if (err) { return callback(err) }
						callback(null, clientUidBlock)
					})
				})
			})
		},
		_selectClientUidBlock:function(conn, personId, callback) {
			conn.selectOne(this, 'SELECT lastClientUidBlockStart AS start, lastClientUidBlockEnd AS end FROM person WHERE id=?',
				[personId], callback)
		},
		_updateClientUidBlock:function(conn, personId, clientUidBlock, callback) {
			conn.updateOne(this, 'UPDATE person SET lastClientUidBlockStart=?, lastClientUidBlockEnd=? WHERE id=?',
				[clientUidBlock.start, clientUidBlock.end, personId], callback)
		},
		_createClaimedAccount:function(req, fbAcc, fbFriends, callback) {
			log('create new person with', fbFriends.length, 'friends')
			this.db.transact(this, function(tx) {
				callback = tx.wrapCallback(callback)
				var emailVerifiedTime = fbAcc.email ? tx.time() : null
				fbAcc.email, emailVerifiedTime
				
				tx.insert(this,
					'INSERT INTO person SET createdTime=?, claimedTime=?, facebookId=?, fullName=?, firstName=?, lastName=?, gender=?, locale=?, timezone=?',
					[tx.time(), tx.time(), fbAcc.id, fbAcc.name, fbAcc.first_name, fbAcc.last_name, fbAcc.gender, fbAcc.locale, fbAcc.timezone],
					function(err, personId) {
						if (err) { return callback(err) }
						this._addFacebookEmail(req, tx, personId, fbAcc, function() {
							this._insertFbContacts(req, tx, fbAcc, fbFriends, callback)
						})
					}
				)
			})
		},
		_claimAccount:function(req, person, fbAcc, fbFriends, callback) {
			log('claim account with', fbAcc, fbFriends.length, 'friends')
			req.timer.start('_claimAccount')
			this.db.transact(this, function(tx) {
				callback = tx.wrapCallback(callback)
				var emailVerifiedTime = fbAcc.email ? tx.time() : null
				// Insert email ignore
				tx.updateOne(this,
					'UPDATE person SET claimedTime=?, fullName=?, firstName=?, lastName=?, gender=?, locale=?, timezone=? WHERE facebookId=? AND id=?',
					[tx.time(), fbAcc.name, fbAcc.first_name, fbAcc.last_name, fbAcc.gender, fbAcc.locale, fbAcc.timezone, fbAcc.id, person.id],
					function(err) {
						if (err) { return callback(err) }
						this._addFacebookEmail(req, tx, person.id, fbAcc, function() {
							req.timer.stop('_claimAccount')
							this._insertFbContacts(req, tx, fbAcc, fbFriends, callback)
						})
					}
				)
			})
		},
		_addFacebookEmail:function(req, conn, personId, fbAcc, callback) {
			req.timer.start('_addFacebookEmail')
			if (fbAcc.email && !fbAcc.email.match('proxymail.facebook.com')) {
				conn.insert(this,
					'INSERT INTO personEmail SET personId=?, emailAddress=?, createdTime=?, claimedTime=?',
					[personId, fbAcc.email, conn.time(), conn.time()], function(err) {
						if (err) { console.log("WARNING _addFacebookEmail failed", err, personId, fbAcc) }
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
			this._selectPersonByFacebookId(tx, fbAccount.id, function(err, person) {
				if (err) { return logErr(err, callback, 'select id by facebook id', fbAccount) }
				var timestamp = tx.time()
				ensureAccountsExist.call(this)
				
				function ensureAccountsExist() {
					serialMap(fbFriends, {
						context:this,
						filterNulls:true,
						iterate: function(fbFriend, next) {
							tx.selectOne(this, 'SELECT id FROM person WHERE facebookId=?', [fbFriend.id], function(err, dogoFriend) {
								if (err) { return next(err) }
								if (dogoFriend) {
									next(null, { personId:dogoFriend.id, facebookId:fbFriend.id, name:fbFriend.name })
								} else {
									this._createUnclaimedAccountForFacebookFriend(tx, fbFriend.id, fbFriend.name, function(err, personId) {
										next(err, err ? null : { personId:personId, facebookId:fbFriend.id, name:fbFriend.name })
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
							try { var ids = orderConversationIds(person.personId, friend.personId) }
							catch(e) { return next(e) }
							tx.selectOne(this, 'SELECT id FROM conversation WHERE person1Id=? AND person2Id=?',
								[ids.person1Id, ids.person2Id],
								function(err, conv) {
								if (err) { return next(err) }
								if (conv) { return next() }
								tx.insert(this, 'INSERT INTO conversation SET person1Id=?, person2Id=?, createdTime=?',
									[ids.person1Id, ids.person2Id, timestamp], function(err, convId) {
										if (err) { return next(err) }
										var waiting = waitFor(2, next)
										var summaryISee = {
											people:[{ personId:friend.personId, facebookId:friend.facebookId, name:friend.name }]
										}
										var summaryFriendSees = {
											people:[{ personId:person.personId, facebookId:person.facebookId, name:person.name }]
										}
										each(ids, function(personId) {
											var summary = (personId == person.personId ? summaryISee : summaryFriendSees)
											tx.insertIgnoreDuplicateEntry(this,
												'INSERT INTO conversationParticipation SET personId=?, conversationId=?, summaryJson=?',
												[personId, convId, JSON.stringify(summary)],
												waiting
											)
										})
									}
								)
							})
						},
						finish:function(err, conversationInfos) {
							callback(err, err ? null : person)
						}
					})
				}
			})
		},
		_updatePersonPushAuth: function(conn, personId, pushToken, pushSystem, callback) {
			conn.updateOne(this,
				'UPDATE person SET pushToken=?, pushSystem=? WHERE id=?',
				[pushToken, pushSystem, personId], callback)
		},
		_createUnclaimedAccountForFacebookFriend: function(conn, facebookId, name, callback) {
			conn.insert(this,
				'INSERT INTO person SET createdTime=?, facebookId=?, fullName=?',
				[conn.time(), facebookId, name], callback)
		},
		_selectPersonByFacebookId: function(conn, facebookId, callback) {
			conn.selectOne(this, sql.selectPerson+'WHERE facebookId=?', [facebookId], callback)
		},
		_selectPersonByPersonId: function(conn, personId, callback) {
			conn.selectOne(this, sql.selectPerson+'WHERE id=?', [personId], callback)
		}
	}
)

var sql = {
	selectPerson: 'SELECT facebookId, fullName as name, firstName, lastName, id, id as personId, pushToken, claimedTime, waitlistedTime FROM person '
}