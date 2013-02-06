var log = makeLog('LookupService')
var inverse = require('std/inverse')

var encodeAddressTypes = { 'email':2, 'phone':3, 'facebook':4 }
var decodeAddressTypes = inverse(encodeAddressTypes)

module.exports = {
	// Register and claim addresses
	claimVerifiedAddress: claimVerifiedAddress,
	createVerifiedAddress: createVerifiedAddress,
	createVerification: createVerification,
	// Lookup addresses
	lookup: lookup,
	lookupEmail: lookupEmail,
	// Associated data with addresses (when messages are sent to non-dogo people)
	addUnclaimedAddress: addUnclaimedAddress,
	updateAddressInfo: updateAddressInfo
}

function claimVerifiedAddress(addrInfo, personId, name, callback) {
	var sql = 'UPDATE addressLookup SET name=?, personId=?, claimedTime=? WHERE addressId=? AND addressType=? AND claimedTime IS NULL'
	var addressType = encodeAddressTypes[addrInfo.addressType]
	db.lookup().updateOne(sql, [name, personId, db.time(), addrInfo.addressId, addressType], callback)
}
function createVerifiedAddress(addrInfo, personId, name, callback) {
	var sql = 'INSERT INTO addressLookup SET name=?, personId=?, claimedTime=?, createdTime=?, addressId=?, addressType=?'
	var addressType = encodeAddressTypes[addrInfo.addressType]
	db.lookup().insert(sql, [name, personId, db.time(), db.time(), addrInfo.addressId, addressType], callback)
}
function createVerification(token, passwordHash, name, color, addrInfo, callback) {
	var sql = 'INSERT INTO addressVerification SET token=?, passwordHash=?, name=?, color=?, addressId=?, addressType=?, createdTime=?'
	var addressType = encodeAddressTypes[addrInfo.addressType]
	db.lookup().insert(sql, [token, passwordHash, name, color, addrInfo.addressId, addressType, db.time()], callback)
}

function lookup(addrInfo, callback) { _lookupByTypeAndAddress(addrInfo.addressType, addrInfo.addressId, callback) }
function lookupEmail(email, callback) { _lookupByTypeAndAddress(Addresses.types.email, email, callback) }
function _lookupByTypeAndAddress(addressType, addressId, callback) {
	var sql = 'SELECT addressType, addressId, personId, name, conversationIdsJson, createdTime, claimedTime FROM addressLookup WHERE addressType=? AND addressId=?'
	db.lookup().selectOne(sql, [addressType, addressId], function(err, addrInfo) {
		if (err) { return callback(err, null) }
		if (!addrInfo) { return callback(null, null) }
		addrInfo.conversationIds = jsonList(remove(addrInfo, 'conversationIdsJson'))
		addrInfo.addressType = decodeAddressTypes[remove(addrInfo, 'addressType')]
		callback(err, addrInfo.personId, addrInfo)
	})
}


function _json(prop) { return prop ? JSON.stringify(prop) : null }
function addUnclaimedAddress(addrInfo, callback) {
	log.debug('add unclaimed address', addrInfo)
	var sql = 'INSERT INTO addressLookup SET name=?, conversationIdsJson=?, addressId=?, addressType=?, createdTime=?'
	var addressType = encodeAddressTypes[addrInfo.addressType]
	db.lookup().insertIgnoreId(sql, [addrInfo.name, _json(addrInfo.conversationIds), addrInfo.addressId, addressType, db.time()], callback)
}
function updateAddressInfo(addrInfo, callback) {
	log.debug('update address', addrInfo)
	var sql = 'UPDATE addressLookup SET name=?, conversationIdsJson=? WHERE addressType=? AND addressId=?'
	var addressType = encodeAddressTypes[addrInfo.addressType]
	db.lookup().updateOne(sql, [addrInfo.name, _json(addrInfo.conversationIds), addressType, addrInfo.addressId], callback)
}
