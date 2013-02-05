module.exports = function claimVerifiedAddresses(addrInfos, personId) {
	_claimAddressConversations(function(err) {
		if (err) { return callback(err) }
		asyncEach(addrInfos, {
			parallel:addrInfos.length,
			iterate:function(addrInfo, next) {
				if (addrInfo.isNewAddress) {
					lookupService.createVerifiedAddress(addrInfo, personId, name)
				} else {
					lookupService.claimVerifiedAddress(addrInfo, personId, name)
				}
			}
		})
	})
	
	function _claimAddressConversations(callback) {
		asyncEach(addrInfos, {
			parallel:addrInfos.length,
			finish:callback,
			iterate:function(addrInfo, next) {
				if (addrInfo.isNewAddress) { return next() }
				var conversationIds = jsonList(remove(addrInfo, 'conversationIdsJson'))
				if (!conversationIds.length) { return next() }
				asyncEach(conversationIds, {
					parallel:conversationIds.length,
					finish:next,
					iterate:_updateConversationAndParticipations
				})
			}
		})
	}
	
	function _updateConversationAndParticipations(conversationId, callback) {
		_getConversationPeople(conversationId, function(err, people) {
			if (err) { return next(err) }
			if (!people.length) { return next(makeAlert('No people in conversation', conversationId)) }
			if (find(people, function(person) { return person.personId == personId })) {
				return callback() // already listed - repairing old attempt
			}
			
			// 1. update other participations 2. create new participation 3. add person to conversation
			var peopleJson = JSON.stringify(people.concat({ personId:personId, name:name }))
			parallel(
				function _updateParticipations(proceed) {
					_setParticipationsPeopleJson(conversationId, people, peopleJson, proceed)
				},
				function _getConversationSummary(proceed) {
					var sql = 'SELECT lastMessageTime, recentJson, picturesJson FROM participation WHERE personId=? AND conversationId=?'
					db.people(firstPersonId).selectOne(sql, [people[0].personId, conversationId], proceed)
				},
				function finish(err, _, summary) {
					if (err) { return callback(err) }
					_createParticipation(personId, conversationId, summary, peopleJson, function(err) {
						if (err) { return callback(err) }
						_setConversationPeople(conversationId, peopleJson, callback)
					})
				}
			)
			
			function _setConversationPeople(conversationId, peopleJson, callback) {
				var sql = 'UPDATE conversation SET peopleJson=? WHERE conversationId=?'
				db.conversations(conversationId).updateOne(sql, [peopleJson, conversationId], callback)
			}
			function _setParticipationsPeopleJson(conversationId, people, peopleJson, callback) {
				asyncEach(people, {
					parallel:people.length,
					finish:function(err) { callback(err) },
					iterate:function(person, next) {
						var sql = 'UPDATE participation SET peopleJson=? WHERE personId=? AND conversationId=?'
						db.people(person.personId).updateOne(sql, [peopleJson, person.personId, conversationId], callback)
					}
				})
			}
			function _createParticipation(personId, conversationId, summary, peopleJson, callback) {
				var lastTime = summary.lastMessageTime
				db.people(personId).insertIgnoreDuplicate('INSERT INTO participation SET '+
					'personId=?, conversationId=?, lastMessageTime=?, lastReceivedTime=?, recentJson=?, picturesJson=?, peopleJson=?',
					[personId, conversationId, lastTime, lastTime, summary.recentJson, summary.picturesJson, peopleJson],
					callback
				)
			}
		})
	}
	
	function _getConversationPeople(conversationId, callback) {
		var sql = 'SELECT peopleJson FROM conversation WHERE conversationId=?'
		db.conversations(conversationId).selectOne(sql, [conversationId], function(err, conversation) {
			if (err) { return callback(err) }
			callback(null, jsonList(remove(res, 'peopleJson'))) // [{ personId:personId, name:personName }, ...]
		})
	}
}
