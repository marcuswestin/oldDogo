var trim = require('std/trim')
var uuid = require('uuid')
var Messages = require('data/Messages')
var pushService = require('server/PushService')
var parallel = require('std/parallel')
var log = makeLog('MessageService')

module.exports = {
	sendMessage: sendMessage,
	getMessages: getMessages,
	saveFacebookRequest: saveFacebookRequest,
	loadFacebookRequestId: loadFacebookRequestId
}

function sendMessage(personId, participationId, clientUid, type, payload, payloadFile, prodPush, callback) {
	log.debug('sendMessage', personId, participationId, clientUid, type, payload)
	if (!Messages.types[type]) { return callback("I don't recognize that message type") }
	
	payload = Messages.payload.cleanForUpload(type, payload)
	if (!payload) { return callback('That message is malformed') }
	
	var sql = 'SELECT conversationId, peopleJson, participationId FROM participation WHERE personId=? AND participationId=?'
	db.people(personId).selectOne(sql, [personId, participationId], function(err, participation) {
		if (err) { return callback(err) }
		if (!participation) { return callback("I couldn't find that conversation") }
		parallel(_getOrCreateConversation, _uploadPayload, function(err, conversationId, payload) {
			if (err) { return callback(err) }
			log.debug('create message with conversation and payload', conversationId, payload)
			_createMessage(conversationId, payload, function(err, message) {
				if (err) { return callback(err) }
				callback(null, message)
				_notifyParticipants(message, prodPush)
			})
		})
		
		function _uploadPayload(next) {
			if (type != 'picture' && type != 'audio') { return next(null, payload) }
			payloadService.uploadPayload(personId, type, payloadFile, function(err, secret) {
				if (!err) { payload.secret = secret }
				return next(err, payload)
			})
		}
		
		function _getOrCreateConversation(proceed) {
			if (participation.conversationId) {
				proceed(null, participation.conversationId)
			} else {
				_createConversation(personId, participation, proceed)
			}
		}
		
		function _createMessage(conversationId, payload, callback) {
			log.debug('create message', conversationId, payload)
			var sql = 'INSERT INTO message SET sentTime=?, fromPersonId=?, clientUid=?, conversationId=?, type=?, payloadJson=?'
			db.conversations(conversationId).insert(sql, [db.time(), personId, clientUid, conversationId, Messages.types[type], JSON.stringify(payload)], function(err, messageId) {
				if (err) { return callback(err) }
				var newMessage = {
					id:messageId, fromPersonId:personId, conversationId:conversationId, clientUid:clientUid,
					sentTime:db.time(), type:type, payload:payload
				}
				callback(null, newMessage)
			})
		}
	})
}

function _createConversation(personId, participation, callback) {
	var people = jsonList(participation.peopleJson)
	log.debug('create new conversation', people)
	var dogoPeople = []
	var otherAddresses = []
	asyncEach(people, {
		parallel:people.length,
		iterate:function(person, next) {
			if (person.personId && person.name) {
				dogoPeople.push(person)
				next()
			} else {
				lookupService.lookup(person, function(err, lookupPersonId, lookupInfo) {
					if (err) { return next(err) }
					if (lookupPersonId) {
						dogoPeople.push({ personId:lookupPersonId, name:lookupInfo.name })
					} else {
						otherAddresses.push({ person:person, lookupInfo:lookupInfo })
					}
					next()
				})
			}
		},
		finish:function(err) {
			if (err) { return callback(err) }
			db.people(personId).selectOne(
				'SELECT personId, name FROM person WHERE personId=?',
				[personId],
				function(err, personInfo) {
					if (err) { return callback(err) }
					var peopleJson = JSON.stringify([personInfo].concat(map(dogoPeople, function(d) {
						return { personId:d.personId, name:d.name }
					})))
					_insertConversation(peopleJson, callback)
				}
			)
		}
	})
	
	function _insertConversation(peopleJson, callback) {
		db.conversations.randomShard().insert(
			'INSERT INTO conversation SET peopleJson=?, createdTime=?',
			[peopleJson, db.time()],
			function(err, conversationId) {
				if (err) { return callback(err) }
				parallel(_setParticipationsConversationId, _updateAddresses, function(err, _, _) {
					log.debug('created conversation', conversationId)
					callback(err, conversationId)
				})
				
				function _setParticipationsConversationId(proceed) {
					log.debug('set participations conversation id', personId, conversationId, participation.participationId)
					db.people(personId).updateOne(
						'UPDATE participation SET conversationId=? WHERE participationId=?',
						[conversationId, participation.participationId],
						function(err) {
							if (err) { return proceed(err) }
							asyncEach(dogoPeople, {
								finish:proceed,
								iterate:function(dogoPerson, next) {
									db.people(dogoPerson.personId).insert(
										'INSERT INTO participation SET conversationId=?, personId=?, peopleJson=?',
										[conversationId, dogoPerson.personId, peopleJson],
										next
									)
								}
							})
						}
					)
				}
				
				function _updateAddresses(proceed) {
					log.debug('update addresses', otherAddresses)
					asyncEach(otherAddresses, {
						parallel:otherAddresses.length,
						finish:proceed,
						iterate:function(info, next) {
							if (info.lookupInfo) {
								var lookupInfo = info.lookupInfo
								if (!lookupInfo.name) { lookupInfo.name = person.name }
								lookupInfo.conversationIds.push(conversationId)
								lookupService.updateAddressInfo(lookupInfo, next)
							} else {
								var person = info.person
								var addrInfo = { addressType:person.addressType, addressId:person.addressId, name:person.name, conversationIds:[conversationId] }
								lookupService.addUnclaimedAddress(addrInfo, next)
							}
						}
					})
				}
			}
		)
	}
}

function _notifyParticipants(message, prodPush) {
	var sql = 'SELECT peopleJson FROM conversation WHERE conversationId=?'
	db.conversations(message.conversationId).selectOne(sql, [message.conversationId], function(err, res) {
		if (err) { return callback(err) }

		var pushFromName
		var people = jsonList(res.peopleJson)
		var recipientPeople = filter(people, function(person) {
			var isMe = (person.personId == message.fromPersonId)
			if (isMe) {
				pushFromName = person.name.split(' ')[0]
				return false
			} else {
				return true
			}
		})
		log.debug('push notifications', recipientPeople)
		each(recipientPeople, function(person) {
			pushService.sendMessagePush(person.personId, pushFromName, message, prodPush)
		})
		log.debug('update participation summaries', people)
		_updateParticipations(people, message)
	})
	
	function _updateParticipations(people, message) {
		each(people, function(person) {
			log.debug('update participation', person)
			var personId = person.personId
			if (!personId) { return }
			var sql = "SELECT peopleJson, recentJson, picturesJson, lastReceivedTime FROM participation WHERE personId=? AND conversationId=?"
			db.people(personId).selectOne(sql, [personId, message.conversationId], function(err, participation) {
				var recent = jsonList(participation.recentJson)
				if (recent.length >= 3) { recent.shift() }
				recent.push(message)

				var pictures = jsonList(participation.picturesJson)
				if (message.type == 'picture') {
					if (pictures.length >= 6) {
						var i = Math.floor(Math.random() * 7)
						if (i != 7) { // 1 in 7 chance of skipping the picture
							pictures[i] = message
						}
					} else {
						pictures.push(message)
					}
				}

				var isMyParticipation = (personId == message.fromPersonId)
				var lastReceivedTime = (isMyParticipation ? participation.lastReceivedTime : db.time())
				var recentJson = JSON.stringify(recent)
				var picturesJson = JSON.stringify(pictures)
				var sql = 'UPDATE participation SET lastMessageTime=?, lastReceivedTime=?, recentJson=?, picturesJson=? WHERE personId=? AND conversationId=?'
				db.people(personId).updateOne(sql, [db.time(), lastReceivedTime, recentJson, picturesJson, personId, message.conversationId], function(err, res) {
					if (err) { log.error("Error updating participation", err, personId, message.conversationId) }
				})
			})
		})
	}
}

function getMessages(personId, participationId, conversationId, callback) {
	log.debug('get messages', personId, participationId, conversationId)
	parallel(_checkPermission, _getMessages, function(err, _, messages) {
		callback(err, messages)
	})
	
	function _checkPermission(callback) {
		var sql = 'SELECT conversationId FROM participation WHERE personId=? AND participationId=? AND conversationId=?'
		db.people(participationId).selectOne(sql, [personId, participationId, conversationId], function(err, res) {
			if (err) { return callback(err) }
			if (!res) { return callback('Unknown conversation') }
			callback(null, null)
		})
	}
	
	function _getMessages(callback) {
		_selectMessages(conversationId, function(err, messages) {
			if (err) { return callback(err) }
			callback(null, messages)
			_updateParticipationLastRead(messages[messages.length - 1])
		})
	}
	
	function _updateParticipationLastRead(lastMessage) {
		if (!lastMessage) { return }
		var sql = 'UPDATE participation SET lastReadTime=? WHERE personId=? AND participationId=?'
		db.people(participationId).updateOne(sql, [db.time(), personId, participationId], function(err) {
			if (err) { log.error('Could not update participation lastReadTime', personId, participationId, conversationId, err) }
		})
	}
}

function saveFacebookRequest(personId, facebookRequestId, toPersonId, conversationId, callback) {
	callback('saveFacebookRequest is not implemented')
	// think through if this should go into lookupService, and what data is required
	// db.shard(facebookRequestId).insert(this,
	// 	'INSERT INTO facebookRequest SET createdTime=?, facebookRequestId=?, fromPersonId=?, toPersonId=?, conversationId=?',
	// 	[this.db.time(), facebookRequestId, personId, toPersonId, conversationId], function(err, res) {
	// 		if (err) { return callback(err) }
	// 		callback(null, 'OK')
	// 	})
}

function loadFacebookRequestId(facebookRequestId, callback) {
	callback('loadFacebookRequestId is not implemented')
	// db.shard(facebookRequestId).selectOne(
	// 	'SELECT fromPersonId, toPersonId, conversationId FROM facebookRequest WHERE facebookRequestId=?',
	// 	[facebookRequestId],
	// 	function(err, facebookRequest) {
	// 		if (err) { return callback(err) }
	// 		if (!facebookRequest) { return callback('Unknown facebook request') }
	// 		_selectMessages(facebookRequest.conversationId, function(err, messages) {
	// 			if (err) { return callback(err) }
	// 			callback(null, { messages:messages, facebookRequest:facebookRequest })
	// 		})
	// 	}
	// )
}

function _selectMessages(conversationId, callback) {
	log.debug('select messages', conversationId)
	var selectMessageSql = [
		'SELECT messageId, fromPersonId, clientUid, conversationId, type, sentTime, payloadJson',
		'FROM message WHERE conversationId=? ORDER BY messageId DESC LIMIT 50'
	].join('\n')
	db.conversations(conversationId).select(
		selectMessageSql,
		[conversationId],
		function(err, messages) {
			if (err) { return callback(err) }
			messages.reverse()
			each(messages, _decodeMessage)
			callback(null, messages)
		}
	)

	function _decodeMessage(message) {
		message.type = Messages.types.reverse[message.type]
		message.payload = JSON.parse(remove(message, 'payloadJson'))
	}
}
