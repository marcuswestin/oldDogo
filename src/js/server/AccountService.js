var uuid = require('uuid')
var facebook = require('./util/facebook')
var orderPersonIds = require('./util/ids').orderPersonIds
var waitFor = require('std/waitFor')
var db = require('server/Database')
var lookupService = require('server/lookupService')
var log = makeLog('AccountService')
var sms = require('server/sms')
var payloadService = require('server/payloadService')
var payloads = require('data/payloads')

module.exports = {
	lookupOrCreatePersonByFacebookAccount:lookupOrCreatePersonByFacebookAccount,
	addAddresses:addAddresses,
	getConversations:getConversations,
	getPerson:getPerson,
	
	setPushAuth:setPushAuth,
	bumpClientUidBlock:bumpClientUidBlock
}

var personSql = 'SELECT facebookId, phoneNumbersJson, emailAddressesJson, name, firstName, lastName, personId, claimedTime, waitlistedTime FROM person WHERE personId=?'
function getPerson(personId, callback) {
	db.people(personId).selectOne(personSql, [personId], function(err, person) {
		if (err || !person) { return callback(err) }
		person.phoneNumbers = jsonList(person.phoneNumbersJson)
		person.emailAddresses = jsonList(person.emailAddressesJson)
		delete person.phoneNumbersJson
		delete person.emailAddressesJson
		callback(null, person)
	})
}

function lookupOrCreatePersonByFacebookAccount(fbAcc, callback) {
	lookupService.byFacebookId(fbAcc.id, function(err, personId, lookupInfo) {
		if (err) { return callback(err) }
		
		if (personId) {
			// A person already owns this address and has an account.
			// This is simply a login for that person from a new device.
			getPerson(personId, callback)

		} else {
			// Address has been not claimed before.
			// SOON: We will have already logged in users claiming additional addresses
			_createPersonAndClaimFacebookAccount(fbAcc, lookupInfo, function(err, personId) {
				if (err) { return callback(err) }
				getPerson(personId, callback)
			})
		}
	})
	
	function _createPersonAndClaimFacebookAccount(fbAcc, lookupInfo, callback) {
		_createPersonWithFbAcc(fbAcc, function(err, personId) {
			if (err) { return callback(err) }
			
			if (lookupInfo) {
				// this facebook id has been sent guest messages to before
				var conversationIds = jsonList(lookupInfo.conversationIdsJson)
				_claimConversations(personId, fbAcc.name, conversationIds, function(err) {
					if (err) { return callback(err) }
					lookupService.claimFacebookAccount(fbAcc, personId, callback)
				})
			} else {
				// totally new facebook id - finish up
				lookupService.addAndClaimFacebookAccount(fbAcc, personId, callback)
			}
		})
		
		function _createPersonWithFbAcc(fbAcc, callback) {
			var time = db.time()
			var birthdate = _getFbAccBirthdate(fbAcc.birthday)
			db.people.randomShard().insert('INSERT INTO person SET createdTime=?, claimedTime=?, facebookId=?, '+
				'name=?, firstName=?, lastName=?, gender=?, birthdate=?, locale=?, timezone=?',
				[time, time, fbAcc.id, fbAcc.name, fbAcc.first_name, fbAcc.last_name, fbAcc.gender, birthdate, fbAcc.locale, fbAcc.timezone],
				function(err, personId) {
					if (err) { return callback(err) }
					callback(null, personId)
					var fbUrl = 'http://graph.facebook.com/'+fbAcc.id+'/picture?type=large'
					log.debug('Create person picture redirect from s3 to fb', personId, fbAcc)
					payloadService.makeRedirect(payloads.personPicturePath(personId), fbUrl, function(err) {
						if (err) { log.warn('Error setting picture redirect', personId, fbAcc, err) }
					})
				}
			)

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
		}

		function _claimConversations(personId, personName, conversationIds, callback) {
			asyncEach(conversationIds, {
				parallel:1,
				finish:callback,
				iterate:function(conversationId, next) {
					// for each conversation
					//		1. add new person to participants list
					// 		2. update other peoples' participations
					//		3. create participation for this new person
					_getConversationPeople(conversationId, function(err, otherPeople) {
						if (err) { return next(err) }
						if (!people.length) {
							log.alert('Unknown conversation in conversationIds', conversationId)
							return next(true)
						}
						
						_addConversationParticipant(conversationId, otherPeople, personId, personName, function(err) {
							if (err) { return next(err) }
							_updateParticipations(conversationId, otherPeople, personId, personName, function(err, summaryInfo) {
								if (err) { return next(err) }
								_createParticipation(personId, conversation, summaryInfo, next)
							})
						})
					})
				}
			})

			function _getConversationPeople(conversationId, callback) {
				db.conversations(conversationId).selectOne(
					'SELECT peopleJson FROM conversation WHERE conversationId=?',
					[conversationId],
					function(err, conversation) {
						if (err) { return callback(err) }
						callback(null, jsonList(res.peopleJson)) // [{ personId:personId, name:personName }, ...]
					}
				)
			}

			function _createParticipation(personId, conversation, summaryInfo, callback) {
				var lastMessageTime = summaryInfo.lastMessageTime
				var recentJson = summaryInfo.recentJson
				var picturesJson = summaryInfo.picturesJson
				var peopleJson = summaryInfo.peopleJson
				db.people(personId).insertIgnoreDuplicate('INSERT INTO participation SET '+
					'personId=?, conversationId=?, lastMessageTime=?, lastReceivedTime=?, recentJson=?, picturesJson=?, peopleJson=?',
					[personId, conversation.conversationId, lastMessageTime, lastMessageTime, recentJson, picturesJson, peopleJson],
					callback
				)
			}

			function _updateParticipations(conversationId, otherPeople, newPersonId, newPersonName, callback) {
				var summaryInfo = null
				var peopleJson = JSON.stringify([{ name:newPersonName, personId:newPersonId }].concat(otherPeople))
				asyncEach(otherPeople, {
					parallel:otherPeople.length,
					finish:function(err) { callback(err, summaryInfo) },
					iterate:function(otherPerson, next) {
						db.people(otherPerson.personId).selectOne(
							'SELECT recentJson, picturesJson, peopleJson, lastMessageTime FROM participation WHERE personId=? AND conversationId=?',
							[otherPerson.personId, conversationId],
							function(err, res) {
								if (err) { return next(err) }
								if (!summaryInfo) { // use the first participation's data
									summaryInfo = { recentJson:res.recentJson, picturesJson:res.picturesJson, peopleJson:peopleJson, lastMessageTime:res.lastMessageTime }
								}
								
								var people = jsonList(res.peopleJson)
								for (var i=0; i<people.length; i++) {
									if (people[i].personId == newPersonId) { return next() } // already listed in this participation
								}
								
								db.people(personId).updateOne('UPDATE participation SET peopleJson=? WHERE personId=? AND conversationId=?', [peopleJson, personId], next)
							}
						)
					}
				})
			}

			function _addConversationParticipant(conversationId, otherPeople, newPersonId, newPersonName, callback) {
				for (var i=0; i<otherPeople.length; i++) {
					if (otherPeople[i].personId == newPersonId) {
						// already in participation
						return next()
					}
				}
				
				var allPeopleJson = JSON.stringify(otherPeople.concat({ personId:newPersonId, name:newPersonName }))
				db.conversations(conversationId).updateOne('UPDATE conversation SET peopleJson=? WHERE conversationId=?', [allPeopleJson, conversationId], next)
			}
		}
	}
}

function addAddresses(req, newAddresses, callback) {
	// Should we loop up addresses here?
	var personId = req.session.personId
	log.debug('add X new people for person Y', newAddresses.length, personId)
	asyncMap(newAddresses, {
		iterate:function(newAddress, next) {
			if (!newAddress.name || !newAddress.type || !newAddress.address) {
				return next({ message:'Conversation people are missing properties', newAddress:newAddress })
			}
			var people = [newAddress]
			db.people(personId).insert(
				'INSERT INTO participation SET personId=?, peopleJson=?',
				[personId, JSON.stringify(people)],
				function(err, participationId) {
					if (err) { return next(err) }
					next(null, { participationId:participationId, people:people })
				}
			)
		},
		finish:function(err, newConversations) {
			if (err) { return callback(err) }
			callback(null, { newConversations:newConversations })
		}
	})
}

function getConversations(req, callback) {
	var personId = req.session.personId
	var selectParticipationsSql = [
		'SELECT participationId, conversationId, lastMessageTime, lastReceivedTime, lastReadTime, peopleJson, recentJson, picturesJson ',
		'FROM participation WHERE personId=? ORDER BY lastMessageTime DESC, conversationId DESC'
	].join('\n')
	db.people(personId).select(selectParticipationsSql, [personId], function(err, participations) {
		if (err) { return callback(err) }
		each(participations, function(partic) {
			partic.people = jsonList(partic.peopleJson)
			partic.recent = jsonList(partic.recentJson)
			partic.pictures = jsonList(partic.picturesJson)
			delete partic.peopleJson
			delete partic.recentJson
			delete partic.picturesJson
		})
		callback(null, participations)
	})
}
		


function setPushAuth(personId, pushToken, pushType, callback) {
	if (!personId) { return callback('Missing person id') }
	if (!pushToken) { return callback('Missing push token') }
	if (!pushType) { return callback('Missing push type') }
	
	db.people(personId).selectOne('SELECT pushJson FROM person WHERE personId=?', [personId], function(err, res) {
		if (err) { return callback(err) }
		var pushInfo = JSON.parse(res.pushJson)
		pushInfo.push({ token:pushToken, type:pushType })
		db.people(personId).updateOne('UPDATE person SET pushJson=? WHERE personId=?', [JSON.stringify(pushInfo), personId], function(err) {
			callback(err)
		})
	})
}

function bumpClientUidBlock(personId, callback) {
	var clientUidBlockSize = 100000
	db.people(personId).transact(function(err, tx) {
		if (err) { return callback(err) }
		callback = tx.wrapCallback(callback)
		tx.selectOne(
			'SELECT lastClientUidBlockStart AS start, lastClientUidBlockEnd AS end FROM person WHERE personId=?',
			[personId],
			function(err, clientUidBlock) {
				if (err) { return callback(err) }
				clientUidBlock.start += clientUidBlockSize
				clientUidBlock.end += clientUidBlockSize
				tx.updateOne(
					'UPDATE person SET lastClientUidBlockStart=?, lastClientUidBlockEnd=? WHERE personId=?',
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

