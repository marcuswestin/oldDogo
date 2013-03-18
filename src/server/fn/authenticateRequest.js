var redis = require('server/redis')
var createSession = require('server/fn/createSession')

module.exports = {
	person: authenticateDogoPerson,
	guest: authenticateDogoGuest
}

function getAuthToken(req, authRegex) {
	var authorization = req.headers.authorization || req.param('authorization')
	if (!authorization) { return null }
	if (!authRegex.test(authorization)) { return callback('Bad auth') }
	return authorization.split(' ')[1]
}

var authPersonRegex = /^DogoPerson \S+/
function authenticateDogoPerson(req, callback) {
	var authToken = getAuthToken(req, authPersonRegex)
	redis.get(createSession.personPrefix+authToken, function(err, personIdStr) {
		if (err) { return callback(err) }
		req.session = { personId:parseInt(personIdStr) }
		if (!req.session.personId) { return callback('Unauthorized') }
		callback()
	})
}

var authGuestRegex = /^DogoGuest \S+/
function authenticateDogoGuest(req, callback) {
	var authToken = getAuthToken(req, authGuestRegex)
	if (!authToken) { return callback('Bad auth') }
	var parts = authToken.split(':')
	if (parts.length != 2) { return callback('Bad auth') }
	var secret = parts[0]
	var conversationId = parseInt(parts[1])
	redis.get(createSession.guestPrefix+authToken, function(err, addressLookupIdStr) {
		var addressLookupId = parseInt(addressLookupIdStr)
		if (!addressLookupId) { return callback('Unauthorized') }
		req.session = { addressLookupId:parseInt(addressLookupIdStr), conversationId:conversationId }
		callback()
	})
}
