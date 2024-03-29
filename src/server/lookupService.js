var log = makeLog('LookupService')

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

function claimVerifiedAddress(addrInfo, personId, name, callback) {
	log.debug('claim verified address', addrInfo, personId, name)
	var sql = 'UPDATE addressLookup SET name=?, personId=?, claimedTime=? WHERE addressId=? AND addressType=? AND claimedTime IS NULL'
	Addresses.normalize(addrInfo)
	db.lookup().updateOne(sql, [name, personId, time.now(), addrInfo.addressId, addrInfo.addressType], callback)
}
function createVerifiedAddress(addrInfo, personId, name, callback) {
	log.debug('create verified address', addrInfo, personId, name)
	var sql = 'INSERT INTO addressLookup SET name=?, personId=?, claimedTime=?, createdTime=?, addressId=?, addressType=?'
	Addresses.normalize(addrInfo)
	var now = time.now()
	db.lookup().insertIgnoreId(sql, [name, personId, now, now, addrInfo.addressId, addrInfo.addressType], callback)
}
function createAddressVerification(passwordHash, name, addrInfo, pictureSecret, callback) {
	log.debug('create address verification', addrInfo, name)
	makeUid(36, function(err, verificationSecret) {
		if (err) { return callback(err) }
		var sql = 'INSERT INTO addressVerification SET verificationSecret=?, passwordHash=?, name=?, addressId=?, addressType=?, pictureSecret=?, createdTime=?'
		Addresses.normalize(addrInfo)
		var values = [verificationSecret, passwordHash, name, addrInfo.addressId, addrInfo.addressType, pictureSecret, time.now()]
		db.lookup().insert(sql, values, function(err, verificationId) {
			callback(err, verificationId, verificationSecret)
		})
	})
}
function getAddressVerification(verificationId, verificationSecret, callback) {
	var sql = 'SELECT verificationId, addressId, addressType, passwordHash, name, verificationSecret, createdTime, usedTime, pictureSecret '
		+ 'FROM addressVerification WHERE verificationId=? AND verificationSecret=?'
	db.lookup().selectOne(sql, [verificationId, verificationSecret], function(err, verification) {
		if (err) { return callback(err) }
		if (!verification) { return callback("I don't recognize this verification - please check that you have the right link.") }
		if (verification.usedTime) { return callback('Sorry, this verification link has already been used') }
		callback(null, verification)
	})
}

function lookupEmail(email, callback) { lookup(Addresses.email(email), callback) }
function lookup(addrInfo, callback) {
	log('lookup address', addrInfo)
	if (Addresses.isDogo(addrInfo)) { return lookupDogoPerson(addrInfo.addressId, callback) }
	Addresses.normalize(addrInfo)
	var sql = 'SELECT lookupId, addressType, addressId, personId, name, conversationIdsJson, createdTime, claimedTime FROM addressLookup WHERE addressType=? AND addressId=?'
	db.lookup().selectOne(sql, [addrInfo.addressType, addrInfo.addressId], function(err, addrInfo) {
		if (err) { return callback(err, null) }
		if (!addrInfo) { return callback(null, null) }
		addrInfo.conversationIds = jsonList(remove(addrInfo, 'conversationIdsJson'))
		callback(err, addrInfo.personId, addrInfo)
	})
}
function lookupDogoPerson(personId, callback) {
	var sql = 'SELECT 1 as addressType, personId as addressId, personId, name, "[]" as conversationIdsJson, joinedTime as createdTime, joinedTime as claimedTime FROM person WHERE personId=?'
	db.person(personId).selectOne(sql, [personId], function(err, person) {
		if (err) { return callback(err) }
		callback(null, person.personId, person)
	})
}


function _json(prop) { return prop ? JSON.stringify(prop) : null }
function addUnclaimedAddress(addrInfo, callback) {
	log.debug('add unclaimed address', addrInfo)
	var sql = 'INSERT INTO addressLookup SET name=?, conversationIdsJson=?, addressId=?, addressType=?, createdTime=?'
	Addresses.normalize(addrInfo)
	db.lookup().insertIgnoreId(sql, [addrInfo.name, _json(addrInfo.conversationIds), addrInfo.addressId, addrInfo.addressType, time.now()], callback)
}
function updateAddressInfo(addrInfo, callback) {
	log.debug('update address', addrInfo)
	var sql = 'UPDATE addressLookup SET name=?, conversationIdsJson=? WHERE addressType=? AND addressId=?'
	Addresses.normalize(addrInfo)
	db.lookup().updateOne(sql, [addrInfo.name, _json(addrInfo.conversationIds), addrInfo.addressType, addrInfo.addressId], callback)
}
