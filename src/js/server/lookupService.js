var log = makeLog('LookupService')

module.exports = {
	// Register and claim addresses
	claimVerifiedAddress: claimVerifiedAddress,
	createVerifiedAddress: createVerifiedAddress,
	// Lookup addresses
	lookup: lookup,
	lookupEmail: lookupEmail,
	// Associated data with addresses (when messages are sent to non-dogo people)
	addUnclaimedAddress: addUnclaimedAddress,
	updateAddressInfo: updateAddressInfo
}


function claimVerifiedAddress(addrInfo, personId, name, callback) {
	var sql = 'UPDATE addressLookup SET name=?, personId=?, claimedTime=? WHERE address=? AND type=? AND claimedTime IS NULL'
	db.lookup().updateOne(sql, [name, personId, db.time(), addrInfo.address, addrInfo.type], callback)
}
function createVerifiedAddress(addrInfo, personId, name, callback) {
	var sql = 'INSERT INTO addressLookup SET name=?, personId=?, claimedTime=?, createdTime=?, address=?, type=?'
	db.lookup().insert(sql, [name, personId, db.time(), db.time(), addrInfo.address, addrInfo.type], callback)
}


function lookup(addrInfo, callback) { _lookupByTypeAndAddress(addrInfo.type, addrInfo.address, callback) }
function lookupEmail(email, callback) { _lookupByTypeAndAddress(Addresses.types.email, email, callback) }
function _lookupByTypeAndAddress(type, address, callback) {
	var sql = 'SELECT type, address, personId, name, conversationIdsJson, createdTime, claimedTime FROM addressLookup WHERE type=? AND address=?'
	db.lookup().selectOne(sql, [type, address], function(err, addrInfo) {
		if (err) { return callback(err, null) }
		if (!addrInfo) { return callback(null, null) }
		addrInfo.conversationIds = jsonList(remove(addrInfo, 'conversationIdsJson'))
		callback(err, addrInfo.personId, addrInfo)
	})
}


function _json(prop) { return prop ? JSON.stringify(prop) : null }
function addUnclaimedAddress(addrInfo, callback) {
	log.debug('add unclaimed address', addrInfo)
	var sql = 'INSERT INTO addressLookup SET name=?, conversationIdsJson=?, address=?, type=?, createdTime=?'
	db.lookup().insertIgnoreId(sql, [addrInfo.name, _json(addrInfo.conversationIds), addrInfo.address, addrInfo.type, db.time()], callback)
}
function updateAddressInfo(addrInfo, callback) {
	log.debug('update address', addrInfo)
	var sql = 'UPDATE addressLookup SET name=?, conversationIdsJson=? WHERE address=? AND type=?'
	db.lookup().updateOne(sql, [addrInfo.name, _json(addrInfo.conversationIds), addrInfo.address, addrInfo.type], callback)
}
