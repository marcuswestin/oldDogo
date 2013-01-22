var uuid = require('uuid')
var facebook = require('./util/facebook')
var orderConversationIds = require('./util/ids').orderConversationIds
var orderPersonIds = require('./util/ids').orderPersonIds
var waitFor = require('std/waitFor')
var db = require('server/Database')
var lookupService = require('server/lookupService')
var log = makeLog('AccountService')

module.exports = {
	lookupOrCreateByFacebookAccount:lookupOrCreateByFacebookAccount,
	lookupOrCreateByEmail:lookupOrCreateByEmail,
	setPushAuth:setPushAuth,
	bumpClientUidBlock:bumpClientUidBlock
}

var personSql = 'SELECT facebookId, name, firstName, lastName, id, id as personId, pushToken, claimedTime, waitlistedTime FROM person '

function lookupOrCreateByFacebookAccount(req, fbAcc, fbAccessToken, callback) {
	req.timer.start('lookupService.lookupPersonIdByFacebookId')
	lookupService.lookupPersonIdByFacebookId(fbAcc.id, function(err, personId) {
		req.timer.stop('lookupService.lookupPersonIdByFacebookId')
		if (err) { return callback(err) }
		// #1 facebook id is unknown => create account; index it with its fb ID; schedule friend processing.
		// #2 facebook id is known => check if account is claimed; claim if not claimed; schedule friend processing.
		if (personId) {
			db.shard(personId).selectOne(personSql+'WHERE id=?', [personId], function(err, person) {
				if (err) { return callback(err) }
				if (!person.claimedTime) {
					_claimPersonAndScheduleInsertFacebookFriends(personId, fbAcc, callback)
				} else {
					callback(null, person)
					_scheduleInsertFacebookFriends(person, fbAccessToken)
				}
			})
		} else {
			db.randomShard().insert('INSERT INTO person SET createdTime=?', [db.time()], function(err, personId) {
				if (err) { return callback(err) }
				lookupService.indexPersonIdByFacebookAccount(fbAcc, personId, function(err) {
					if (err) { return callback(err) }
					_claimPersonAndScheduleInsertFacebookFriends(personId, fbAcc, callback)
				})
			})
		}
	})
	
	function _claimPersonAndScheduleInsertFacebookFriends(personId, fbAcc, callback) {
		db.shard(personId).updateOne(
			'UPDATE person SET claimedTime=?, facebookId=?, name=?, firstName=?, lastName=?, gender=?, birthdate=?, locale=?, timezone=? WHERE id=?',
			[db.time(), fbAcc.id, fbAcc.name, fbAcc.first_name, fbAcc.last_name, fbAcc.gender, _getFbAccBirthdate(fbAcc.birthday), fbAcc.locale, fbAcc.timezone, personId],
			function(err) {
				if (err) { return callback(err) }
				db.shard(personId).selectOne(personSql+'WHERE id=?', [personId], function(err, person) {
					callback(err, person)
					if (!err) { _scheduleInsertFacebookFriends(person, fbAccessToken) }
				})
			}
		)
	}
}

function _getFbAccBirthdate(birthday) {
	 // "11/23/1985" -> "1985-11-23"
	// "06/17" -> "0000/06/17"
	// "32" -> null
	// "", null, undefined -> null
	if (!birthday) { return null }
	var parts = birthday.split('/')
	if (parts.length == 1) { return null }
	if (parts.length == 2) { parts.push('0000') }
	return parts[2]+'-'+parts[0]+'-'+parts[1]
}

function _scheduleInsertFacebookFriends(person, fbAccessToken) {
	// => for each facebook friend:
	// 		if facebook id is not known
	// 			create person on random shard_F
	// 			index person by facebook id
	//		create conversation between person and friend on shard_F
	//		& the 2 conversation participations on shard_A & shard_F
	var personId = person.id
	facebook.get('/me/friends?fields=id,name,birthday', { access_token:fbAccessToken }, function(err, res) {
		if (err) { return log.error('Could not get facebook friends', personId, fbAcc, fbAccessToken, err) }
		var numFriends = res.data.length
		log.info('inserting '+numFriends+' facebook friends for person '+personId)
		// Serially or in parallel?
		// In serial we don't use throughput of the multiple shards
		processFbFriendsParallel(res.data)
		// processFbFriendsSerially(res.data)
	})
	
	function processFbFriendsParallel(fbFriends) {
		function fakeNext(err) {
			if (err) { log.error('error while processing friends in parallel', err) }
		}
		each(fbFriends, function(fbFriend, i) {
			processFriend(fbFriend, i, fakeNext)
		})
	}
	
	function processFbFriendsSerially(fbFriends) {
		var numFriends = fbFriends.length
		serialMap(fbFriends, {
			iterate:processFriend,
			finish:function(err) {
				if (err) {
					log.error('Error while inserting '+numFriends+' facebook friends for person '+personId, err)
				}
				log.info('finished inserting '+numFriends+' facebook friends for person '+personId)
			}
		})
	}
	
	function processFriend(fbFriend, i, next) {
		lookupService.lookupPersonIdByFacebookId(fbFriend.id, function(err, friendPersonId) {
			if (err) { return next(err) }
			if (friendPersonId) {
				_createConversation(person, fbFriend, friendPersonId, next)
			} else {
				db.randomShard().insert(
					'INSERT INTO person SET createdTime=?, facebookId=?, name=?, birthdate=?',
					[db.time(), fbFriend.id, fbFriend.name, _getFbAccBirthdate(fbFriend.birthday)],
					function(err, friendPersonId) {
						if (err) { return next(err) }
						lookupService.indexPersonIdByFacebookId(fbFriend.id, friendPersonId, function(err) {
							if (err) { return next(err) }
							_createConversation(person, fbFriend, friendPersonId, function(err) {
								if (err) {
									log.error('Error while creating conversation', err, person, fbFriend, friendPersonId)
								}
								next()
							})
						}
					)
				})
			}
		})
	}
}

function _createConversation(person, fbFriend, friendPersonId, callback) {
	try { var ids = orderPersonIds(person.id, friendPersonId) }
	catch(e) { return callback(e) }
	// create conversations on the friend's shard to spread them out
	var participants = [{ id:person.id, name:person.name }, { id:friendPersonId, name:fbFriend.name }]
	db.shard(friendPersonId).insert(
		'INSERT INTO conversation SET person1Id=?, person2Id=?, participantsJson=?, createdTime=?',
		[ids[0], ids[1], JSON.stringify(participants), db.time()],
		function(err, conversationId) {
			if (err) { return callback(err) }
			var waiting = waitFor(2, callback)
			var summaryISee = {
				people:[{ personId:friendPersonId, facebookId:fbFriend.id, name:fbFriend.name }]
			}
			var summaryFriendSees = {
				people:[{ personId:person.id, facebookId:person.facebookId, name:person.name }]
			}
			each(ids, function(personId) {
				var summary = (personId == person.id ? summaryISee : summaryFriendSees)
				db.shard(personId).insertIgnoreDuplicate(
					'INSERT INTO conversationParticipation SET personId=?, conversationId=?, summaryJson=?',
					[personId, conversationId, JSON.stringify(summary)],
					waiting
				)
			})
		}
	)
}

function lookupOrCreateByEmail(emailAddress, callback) {
	if (!emailAddress) { return callback('Missing email address') }
	lookupService.personByEmail(emailAddress, function(err, personId) {
		if (err) { return callback(err) }
		var shard = db.shard(personId)
		if (personId) {
			shard.selectOne(personSql+'WHERE id=?', [personId], callback)
		} else {
			shard.insert('INSERT INTO person SET createdTime=?', [shard.time()], function(err, personId) {
				if (err) { return callback(err) }
				lookupService.indexPersonByEmail(emailAddress, personId, function(err) {
					if (err) { return callback(err) }
					shard.selectOne(personSql+'WHERE id=?', personId, callback)
				})
			})
		}
	})
}

function setPushAuth(personId, pushToken, pushSystem, callback) {
	db.shard(personId).updateOne(
		'UPDATE person SET pushToken=?, pushSystem=? WHERE id=?',
		[pushToken, pushSystem, personId],
		callback
	)
}

function bumpClientUidBlock(personId, callback) {
	var clientUidBlockSize = 100000
	db.shard(personId).transact(function(tx) {
		callback = tx.wrapCallback(callback)
		tx.selectOne(
			'SELECT lastClientUidBlockStart AS start, lastClientUidBlockEnd AS end FROM person WHERE id=?',
			[personId],
			function(err, clientUidBlock) {
				if (err) { return callback(err) }
				clientUidBlock.start += clientUidBlockSize
				clientUidBlock.end += clientUidBlockSize
				tx.updateOne(
					'UPDATE person SET lastClientUidBlockStart=?, lastClientUidBlockEnd=? WHERE id=?',
					[clientUidBlock.start, clientUidBlock.end, personId],
					function(err) {
						if (err) { return callback(err) }
						callback(null, clientUidBlock)
					}
				)
			}
		)
	})
}

