var getConversations = require('server/fn/getConversations')

module.exports = function createConversation(req, contacts, callback) {
	var personId = req.session.personId
	contacts.unshift({ addressType:Addresses.types.dogo, addressId:personId })
	_lookupContacts(contacts, function(err, dogoPeople, externalAddressInfos) {
		if (err) { return callback(err) }
		var peopleJson = JSON.stringify(dogoPeople.concat(map(externalAddressInfos, function(addrInfo) {
			return addrInfo.contact
		})))
		_createConversation(peopleJson, function(err, conversationId) {
			if (err) { return callback(err) }
			parallel(doCreateParticipations, doCreateGuestAccesses, doUpdateOtherAddresses, function(err) {
				if (err) { return callback(err) }
				getConversations.getOne(personId, conversationId, function(err, conversation) {
					if (err) { return callback(err) }
					callback(null, conversation)
				})
			})
			
			function doCreateParticipations(callback) {
				log('create participations for', dogoPeople, conversationId)
				_createParticipations(dogoPeople, conversationId, peopleJson, callback)
			}
			function doCreateGuestAccesses(callback) {
				if (!externalAddressInfos.length) { return callback() }
				log('create guess access for', externalAddressInfos)
				_createGuestAccesses(externalAddressInfos, conversationId, callback)
			}
			function doUpdateOtherAddresses(callback) {
				log('update addresses', externalAddressInfos, conversationId)
				_updateAddresses(externalAddressInfos, conversationId, callback)
			}
		})
	})
}

function _createGuestAccesses(externalAddressInfos, conversationId, callback) {
	var now = time.now()
	asyncEach(externalAddressInfos, {
		parallel:true,
		finish:callback,
		iterate:function(addrInfo, callback) {
			makeUid(24, function(err, secret) {
				var sql = 'INSERT INTO guestAccess SET conversationId=?, secret=?, createdTime=?, guestIndex=?'
				db.conversation(conversationId).insertIgnoreId(sql, [conversationId, secret, now, addrInfo.guestIndex], callback)
			})
		}
	})
}

function _lookupContacts(contacts, callback) {
	var dogoPeople = []
	var externalAddressInfos = []
	asyncEach(contacts, {
		parallel:contacts.length,
		iterate:function(contact, index, callback) {
			lookupService.lookup(contact, function(err, personId, lookupInfo) {
				log('looked up', lookupInfo)
				if (personId) {
					dogoPeople.push({ addressType:Addresses.types.dogo, addressId:personId, name:lookupInfo.name })
				} else {
					externalAddressInfos.push({ contact:contact, lookupInfo:lookupInfo, guestIndex:index })
				}
				callback()
			})
		},
		finish:function(err) {
			if (err) { return callback(err) }
			callback(null, dogoPeople, externalAddressInfos)
		}
	})
}

function _createConversation(peopleJson, callback) {
	var sql = 'INSERT INTO conversation SET peopleJson=?, createdTime=?'
	db.conversation.randomShard().insert(sql, [peopleJson, time.now()], callback)
}

function _createParticipations(dogoPeople, conversationId, peopleJson, callback) {
	asyncEach(dogoPeople, {
		parallel:dogoPeople.length,
		finish:callback,
		iterate:function(dogoPerson, callback) {
			var sql = 'INSERT INTO participation SET personId=?, conversationId=?, peopleJson=?'
			db.person(dogoPerson.addressId).insert(sql, [dogoPerson.addressId, conversationId, peopleJson], callback)
		}
	})
}

function _updateAddresses(otherAddresses, conversationId, callback) {
	asyncEach(otherAddresses, {
		parallel:otherAddresses.length,
		finish:callback,
		iterate:function(addressInfo, callback) {
			log('address', addressInfo)
			var contact = addressInfo.contact
			var lookupInfo = addressInfo.lookupInfo
			if (lookupInfo) {
				if (!lookupInfo.name) { lookupInfo.name = contact.name }
				lookupInfo.conversationIds.push(conversationId)
				lookupService.updateAddressInfo(lookupInfo, callback)
			} else {
				lookupInfo = { addressType:contact.addressType, addressId:contact.addressId, name:contact.name, conversationIds:[conversationId] }
				lookupService.addUnclaimedAddress(lookupInfo, callback)
			}
			
		}
	})
}
