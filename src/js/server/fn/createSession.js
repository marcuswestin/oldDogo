var getPerson = require('server/fn/getPerson')
var bumpClientUidBlock = require('server/fn/bumpClientUidBlock')
var redis = require('server/redis')
var checkPasswordAgainstHash = require('server/fn/checkPasswordAgainstHash')
var uuid = require('uuid')

module.exports = function createSession(addrInfo, password, callback) {
	if (!addrInfo || !addrInfo.addressId || !addrInfo.addressType) { return callback('Please give me an address') }
	if (!password) { return callback('Please give me a password') }
	log.debug('create session', addrInfo)
	lookupService.lookup(addrInfo, function(err, personId, _) {
		if (err) { return callback(err) }
		if (!personId) { return callback("I don't recognize "+addrInfo.addressId+".") }
		log.debug('get person and check password', personId)
		getPerson.andPasswordHash(personId, function(err, person, passwordHash) {
			if (err) { return callback(err) }
			if (!person) {
				log.alert('address has personId but no person and passwordHash', addrInfo, personId)
				return callback(true)
			}
			checkPasswordAgainstHash(password, passwordHash, function(err) {
				if (err) { return callback(err) }
				log.debug('create session in redis')
				var authToken = uuid.v4()
				var expiration = (1 * time.day) / time.seconds // expiration in seconds
				redis.setex('sess:'+authToken, expiration, personId, function(err) {
					if (err) { return callback(err) }
					log.debug('bump client uid block')
					bumpClientUidBlock(personId, function(err, clientUidBlock) {
						if (err) { return callback(err) }
						var sessionInfo = {
							authToken:authToken,
							person:person,
							clientUidBlock:clientUidBlock,
							config:{
								payloads: gConfig.aws.s3
							}
						}
						log.debug('session created', sessionInfo)
						callback(null, sessionInfo)
					})
				})
			})
		})
	})
}
