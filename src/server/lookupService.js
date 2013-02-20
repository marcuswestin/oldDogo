var uuid = require('uuid')
var inverse = require('std/inverse')

var log = makeLog('LookupService')
var encodeAddressTypes = { 'email':2, 'phone':3, 'facebook':4 }
var decodeAddressTypes = inverse(encodeAddressTypes)

module.exports = {
	// Register and claim addresses
	claimVerifiedAddress: claimVerifiedAddress,
	createVerifiedAddress: createVerifiedAddress,
	createAddressVerification: createAddressVerification,
	getAddressVerification: getAddressVerification,
	// Lookup addresses
	lookup: lookup,
	lookupEmail: lookupEmail,
	// Associated data with addresses (when messages are sent to non-dogo people)
	addUnclaimedAddress: addUnclaimedAddress,
	updateAddressInfo: updateAddressInfo
}

function normalizeAddressId(addressType, addressId) {
	return addressId.toLowerCase()
}

function claimVerifiedAddress(addrInfo, personId, name, callback) {
	log.debug('claim verified address', addrInfo, personId, name)
	var sql = 'UPDATE addressLookup SET name=?, personId=?, claimedTime=? WHERE addressId=? AND addressType=? AND claimedTime IS NULL'
	var addressType = encodeAddressTypes[addrInfo.addressType]
	var addressId = normalizeAddressId(addressType, addrInfo.addressId)
	db.lookup().updateOne(sql, [name, personId, db.time(), addressId, addressType], callback)
}
function createVerifiedAddress(addrInfo, personId, name, callback) {
	log.debug('create verified address', addrInfo, personId, name)
	var sql = 'INSERT INTO addressLookup SET name=?, personId=?, claimedTime=?, createdTime=?, addressId=?, addressType=?'
	var addressType = encodeAddressTypes[addrInfo.addressType]
	var addressId = normalizeAddressId(addressType, addrInfo.addressId)
	db.lookup().insertIgnoreId(sql, [name, personId, db.time(), db.time(), addressId, addressType], callback)
}
function createAddressVerification(passwordHash, name, addrInfo, pictureSecret, callback) {
	log.debug('create address verification', addrInfo, name)
	var verificationToken = uuid.v4()
	var sql = 'INSERT INTO addressVerification SET verificationToken=?, passwordHash=?, name=?, addressId=?, addressType=?, pictureSecret=?, createdTime=?'
	var addressType = encodeAddressTypes[addrInfo.addressType]
	var addressId = normalizeAddressId(addressType, addrInfo.addressId)
	var values = [verificationToken, passwordHash, name, addressId, addressType, pictureSecret, db.time()]
	db.lookup().insert(sql, values, function(err, verificationId) {
		callback(err, verificationId, verificationToken)
	})
}
function getAddressVerification(verificationId, verificationToken, callback) {
	var sql = 'SELECT verificationId, addressId, addressType, passwordHash, name, verificationToken, createdTime, usedTime, pictureSecret '
		+ 'FROM addressVerification WHERE verificationId=? AND verificationToken=?'
	db.lookup().selectOne(sql, [verificationId, verificationToken], function(err, verification) {
		if (err) { return callback(err) }
		if (!verification) { return callback("I don't recognize this verification - please check that you have the right link.") }
		if (verification.usedTime) { return callback('Sorry, this verification link has already been used') }
		verification.addressType = decodeAddressTypes[verification.addressType]
		callback(null, verification)
	})
}

function lookup(addrInfo, callback) { _lookupByTypeAndAddress(addrInfo.addressType, addrInfo.addressId, callback) }
function lookupEmail(email, callback) { _lookupByTypeAndAddress(Addresses.types.email, email, callback) }
function _lookupByTypeAndAddress(addressType, addressId, callback) {
	log.debug('lookup address', addressType, addressId)
	var sql = 'SELECT addressType, addressId, personId, name, conversationIdsJson, createdTime, claimedTime FROM addressLookup WHERE addressType=? AND addressId=?'
	addressType = encodeAddressTypes[addressType]
	addressId = normalizeAddressId(addressType, addressId)
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
	var addressId = normalizeAddressId(addressType, addrInfo.addressId)
	db.lookup().insertIgnoreId(sql, [addrInfo.name, _json(addrInfo.conversationIds), addressId, addressType, db.time()], callback)
}
function updateAddressInfo(addrInfo, callback) {
	log.debug('update address', addrInfo)
	var sql = 'UPDATE addressLookup SET name=?, conversationIdsJson=? WHERE addressType=? AND addressId=?'
	var addressType = encodeAddressTypes[addrInfo.addressType]
	var addressId = normalizeAddressId(addressType, addrInfo.addressId)
	db.lookup().updateOne(sql, [addrInfo.name, _json(addrInfo.conversationIds), addressType, addressId], callback)
}
