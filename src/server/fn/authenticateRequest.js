var redis = require('server/redis')
var createSession = require('server/fn/createSession')

module.exports = {
	person: authenticateDogoPerson,
	guest: authenticateDogoGuest,
	personOrGuest: personOrGuest
}

function getAuthToken(req, authRegex) {
	var authorization = req.headers.authorization || req.param('authorization')
	if (!authorization) { return null }
	if (!authRegex.test(authorization)) { return null }
	return authorization.split(' ')[1]
}


function personOrGuest(req, callback) {
	if (authPersonRegex.test(req.headers.authorization)) { return authenticateDogoPerson(req, callback) }
	else if (authGuestRegex.test(req.headers.authorization)) { return authenticateDogoGuest(req, callback) }
	else { return callback('Unknown auth') }
}

var authPersonRegex = /^DogoPerson \S+/
function authenticateDogoPerson(req, callback) {
	var authToken = getAuthToken(req, authPersonRegex)
	if (!authToken) { return callback('Bad auth') }
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
	if (parts.length != 3) { return callback('Bad auth') }
	var secret = parts[0]
	var conversationId = parseInt(parts[1])
	var personIndex = parseInt(parts[2])
	redis.get(createSession.guestPrefix+authToken, function(err, authorized) {
		if (!authorized) { return callback('Unauthorized') }
		req.session = { guest:true, conversationId:conversationId, personIndex:personIndex }
		callback()
	})
}
