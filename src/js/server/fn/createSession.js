var getPerson = require('server/fn/getPerson')
var bumpClientUidBlock = require('server/fn/bumpClientUidBlock')
var redis = require('server/redis')
var checkPasswordAgainstHash = require('server/fn/checkPasswordAgainstHash')

module.exports = function createSession(req, addrInfo, password, callback) {
	if (!username) { return callback('Please give me an address') }
	if (!password) { return callback('Please give me a password') }
	lookupService.lookup(addrInfo, function(err, personId, _) {
		if (err) { return callback(err) }
		if (!personId) { return callback("I don't recognize "+addrInfo.addressId+".") }
		getPerson.andPasswordHash(personId, function(err, person, passwordHash) {
			if (err) { return callback(err) }
			if (!person) {
				log.alert('address has personId but no person and passwordHash', addrInfo, personId)
				return callback(true)
			}
			checkPasswordAgainstHash(password, passwordHash, function(err) {
				if (err) { return callback(err) }
				var authToken = uuid.v4()
				var expiration = (1 * time.day) / time.seconds // expiration in seconds
				redis.setex('sess:'+authToken, expiration, personId, function(err) {
					if (err) { return callback(err) }
					bumpClientUidBlock(personId, function(err, clientUidBlock) {
						if (err) { return callback(err) }
						var sessionInfo = {
							authToken:authToken,
							person:person,
							clientUidBlock:clientUidBlock,
							picturesBucket:payloads.bucket,
							config:{
								payloads: gConfig.aws.s3
							}
						}
						callback(null, sessionInfo)
					})
				})
			})
		})
	})
}
