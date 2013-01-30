var db = require('server/Database')
var log = require('server/util/log').makeLog('LookupService')
var Addresses = require('data/Addresses')

module.exports = {
	byFacebookId: lookupByFacebookId,
	claimFacebookAccount: claimFacebookAccount,
	addAndClaimFacebookAccount: addAndClaimFacebookAccount,
	lookupPerson: lookupPerson,
	
	addUnclaimedAddress:addUnclaimedAddress,
	updateAddress:updateAddress
}

function _json(prop) { return prop ? JSON.stringify(prop) : null }

function addUnclaimedAddress(addrInfo, callback) {
	log.debug('add unclaimed address', addrInfo)
	db.lookup().insertIgnoreId('INSERT INTO addressLookup SET name=?, conversationIdsJson=?, address=?, type=?, createdTime=?',
		[addrInfo.name, _json(addrInfo.conversationIds), addrInfo.address, addrInfo.type, db.time()],
		callback
	)
}

function updateAddress(addrInfo, callback) {
	log.debug('update address', addrInfo)
	db.lookup().updateOne('UPDATE addressLookup SET name=?, conversationIdsJson=? WHERE address=? AND type=?',
		[addrInfo.name, _json(addrInfo.conversationIds), addrInfo.address, addrInfo.type],
		callback
	)
}

function lookupByFacebookId(facebookId, callback) {
	_lookupByTypeAndAddress(Addresses.type.facebook, facebookId, callback)
}

function claimFacebookAccount(fbAcc, personId, callback) {
	_claimAddress(Addresses.types.facebook, fbAcc.id, personId, fbAcc.name, callback)
}

function addAndClaimFacebookAccount(fbAcc, personId, callback) {
	_addAndClaimAddress(Addresses.types.facebook, fbAcc.id, personId, fbAcc.name, callback)
}

function lookupPerson(person, callback) {
	return _lookupByTypeAndAddress(person.type, person.address, callback)
}

function _lookupByTypeAndAddress(type, address, callback) {
	db.lookup().selectOne(
		'SELECT type, address, personId, name, conversationIdsJson, createdTime, claimedTime FROM addressLookup WHERE type=? AND address=?',
		[type, address],
		function(err, addrInfo) {
			if (err) { return callback(err, null) }
			if (!addrInfo) { return callback(null, null) }
			addrInfo.conversationIds = jsonList(addrInfo.conversationIdsJson)
			delete addrInfo.conversationIdsJson
			callback(err, addrInfo.personId, addrInfo)
		}
	)
}

function _claimAddress(type, address, personId, name, callback) {
	db.lookup().updateOne(
		'UPDATE addressLookup SET personId=?, name=? WHERE type=? AND address=? AND claimedTime IS NULL',
		[personId, name, type, address],
		function(err) { callback(err, personId) }
	)
}

function _addAndClaimAddress(type, address, personId, name, callback) {
	db.lookup().insertIgnoreId(
		'INSERT INTO addressLookup SET type=?, address=?, personId=?, name=?, createdTime=?, claimedTime=?',
		[type, address, personId, name, db.time(), db.time()],
		function(err) { callback(err, personId) }
	)
}
