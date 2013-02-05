var uuid = require('uuid')
var makeRedisClient = require('redis').createClient
var time = require('std/time')
var facebook = require('server/util/facebook')
var log = makeLog('session')
var payloads = require('data/payloads')
var bcrypt = require('bcrypt')
var Addresses = require('data/Addresses')
var bumpClientUidBlock = require('server/fn/bumpClientUidBlock')
var getPerson = require('server/fn/getPerson')
var password = require('server/util/password')

var redis = makeRedisClient()

module.exports = {
	create:createSession,
	authenticateRequest:authenticateRequest
}

function createSession(req, username, password, callback) {
	if (!username) { return callback('Please give me a username') }
	if (!password) { return callback('Please give me a password') }
	db.lookup().selectOne('SELECT personId FROM addressLookup WHERE type=? AND address=?', [Addresses.dogo, username], function(err, res) {
		if (err) { return callback(err) }
		if (!res) { return callback("I don't recognize your username.") }
		getPerson.andPasswordHash(res.personId, function(err, person, passwordHash) {
			if (err) { return callback(err) }
			if (!person) {
				log.alert('username has personId but no passwordHash', username, personId)
				return callback(true)
			}
			password.checkAgainstHash(password, passwordHash, function(err) {
				if (err) { return callback(err) }
				_createSessionForPersonId(person.personId, function(err, authToken) {
					if (err) { return callback(err) }
					bumpClientUidBlock(person.personId, function(err, clientUidBlock) {
						if (err) { return callback(err) }
						var sessionInfo = { authToken:authToken, person:person, clientUidBlock:clientUidBlock, picturesBucket:payloads.bucket }
						callback(null, sessionInfo)
					})
				})
			})
		})
	})
}

function authenticateRequest(req, callback) {
	if (!req.authorization) { return callback('Unauthorized') }

	try {
		var parts = req.authorization.split(' ')
		if (parts.length != 2) {
			log.warn('Saw bad auth', req.authorization)
			return callback('Bad auth')
		}
		
		var scheme = parts[0]
		if (scheme != 'Basic') {
			return callback('Unknown auth scheme - expected "Basic"')
		}
		
		var authToken = new Buffer(parts[1], 'base64').toString()
	} catch(e) {
		log.warn(e)
		return callback('Error parsing auth: '+ req.authorization)
	}
	
	redis.get('sess:'+authToken, function(err, personIdStr) {
		if (err) { return callback(err) }
		var personId = personIdStr && parseInt(personIdStr)
		if (!personId) { return callback('Unauthorized') }
		callback(null, personId)
	})
}

function _createSessionForPersonId(personId, callback) {
	var authToken = uuid.v4()
	var expiration = (1 * time.day) / time.seconds // expiration in seconds
	
	redis.setex('sess:'+authToken, expiration, personId, function(err) {
		if (err) { return callback(err) }
		callback(null, authToken)
	})
}
