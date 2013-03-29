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

	var authTokenParts = authToken.split(':')
	var secret = authTokenParts[0]
	var sessionId = parseInt(authTokenParts[1])
	var personId = parseInt(authTokenParts[2])
	if (!secret || isNaN(sessionId) || isNaN(personId)) { return callback('Bad auth') }

	redis.get(createSession.personPrefix+authToken, function(err, authenticated) {
		if (err) { return callback(err) }
		if (authenticated) { return proceed(personId) }
		log('Did not find dogo session in redis. Try database', personId)
		var sql = 'SELECT personId FROM session WHERE sessionId=? AND secret=? AND personId=?'
		db.person(sessionId).selectOne(sql, [sessionId, secret, personId], function(err, res) {
			if (err) { return callback(err) }
			if (!res) { return callback('Unauthorized') }
			createSession.inRedis(secret, sessionId, personId, function(err) {
				if (err) { return callback(err) }
				proceed(personId)
			})
		})

		function proceed(personId) {
			if (!personId) { return callback('Unauthorized') }
		req.session = { personId:personId }
			callback()
		}
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
	if (!secret || isNaN(conversationId) || isNaN(personIndex)) { return callback('Bad auth') }
	redis.get(createSession.guestPrefix+authToken, function(err, authorized) {
		if (authorized) { return proceed() }
		log('Did not find guest session in redis. Try database', conversationId, personIndex)
		var sql = "SELECT createdTime FROM guestAccess WHERE conversationId=? AND secret=? AND personIndex=?"
		db.conversation(conversationId).selectOne(sql, [conversationId, secret, personIndex], function(err, res) {
			if (err) { return callback(err) }
			if (!res.createdTime) { return callback('Unauthorized') }
			createSession.forGuest.inRedis(conversationId, personIndex, secret, function(err) {
				if (err) { return callback(err) }
				proceed()
			})
		})
		function proceed() {
			req.session = { guest:true, conversationId:conversationId, personIndex:personIndex }
			callback()
		}
	})
}
