var getPerson = require('server/fn/getPerson')
var bumpClientUidBlock = require('server/fn/bumpClientUidBlock')
var password = require('server/util/password')
var redis = require('server/redis')

module.exports = function createSession(req, username, password, callback) {
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
						var config = { payloads: gConfig.aws.s3 }
						var sessionInfo = { authToken:authToken, person:person, clientUidBlock:clientUidBlock, picturesBucket:payloads.bucket, config:config }
						callback(null, sessionInfo)
					})
				})
			})
		})
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
