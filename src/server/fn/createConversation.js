var getConversations = require('server/fn/getConversations')

module.exports = function createConversation(req, contacts, callback) {
	var personId = req.session.personId
	contacts.unshift({ addressType:Addresses.types.dogo, addressId:personId })
	_lookupContacts(contacts, function(err, dogoPeople, otherAddresses) {
		if (err) { return callback(err) }
		var otherContacts = map(otherAddresses, function(addrInfo) { return addrInfo.contact })
		var peopleJson = JSON.stringify(dogoPeople.concat(otherContacts))
		_createConversation(peopleJson, function(err, conversationId) {
			if (err) { return callback(err) }
			parallel(doCreateParticipations, doUpdateOtherAddresses, function(err) {
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
			function doUpdateOtherAddresses(callback) {
				log('update addresses', otherAddresses, conversationId)
				_updateAddresses(otherAddresses, conversationId, callback)
			}
		})
	})
}

function _lookupContacts(contacts, callback) {
	var dogoPeople = []
	var otherAddresses = []
	asyncEach(contacts, {
		parallel:contacts.length,
		iterate:function(contact, callback) {
			lookupService.lookup(contact, function(err, personId, lookupInfo) {
				log('looked up', lookupInfo)
				if (personId) {
					dogoPeople.push({ addressType:Addresses.types.dogo, addressId:personId, name:lookupInfo.name })
				} else {
					otherAddresses.push({ contact:contact, lookupInfo:lookupInfo })
				}
				callback()
			})
		},
		finish:function(err) {
			if (err) { return callback(err) }
			callback(null, dogoPeople, otherAddresses)
		}
	})
}

function _createConversation(peopleJson, callback) {
	var sql = 'INSERT INTO conversation SET peopleJson=?, createdTime=?'
	db.conversations.randomShard().insert(sql, [peopleJson, now()], callback)
}

function _createParticipations(dogoPeople, conversationId, peopleJson, callback) {
	asyncEach(dogoPeople, {
		parallel:dogoPeople.length,
		finish:callback,
		iterate:function(dogoPerson, callback) {
			var sql = 'INSERT INTO participation SET personId=?, conversationId=?, peopleJson=?'
			db.people(dogoPerson.addressId).insert(sql, [dogoPerson.addressId, conversationId, peopleJson], callback)
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
