var getPerson = require('server/fn/getPerson')
var bumpClientUidBlock = require('server/fn/bumpClientUidBlock')
var redis = require('server/redis')
var checkPasswordAgainstHash = require('server/fn/checkPasswordAgainstHash')
var log = makeLog('createSession')
var getClientConfig = require('server/fn/getClientConfig')

module.exports = createSession
createSession.forGuest = createGuestSession
createSession.guestPrefix = 'g:'
createSession.personPrefix = 'p:'

function createGuestSession(conversationId, personIndex, secret, callback) {
	var sql = 'SELECT 1 FROM guestAccess WHERE conversationId=? AND personIndex=? AND secret=?'
	db.conversation(conversationId).selectOne(sql, [conversationId, personIndex, secret], function(err, res) {
		if (err) { return callback(err) }
		if (!res) { return callback('Unknown conversation') }
		var sql = 'SELECT peopleJson FROM conversation WHERE conversationId=?'
		db.conversation(conversationId).selectOne(sql, [conversationId], function(err, res) {
			if (err) { return callback(err) }
			var people = JSON.parse(res.peopleJson)
			var person = people[personIndex]
			lookupService.lookup(person, function(err, personId, addrInfo) {
				if (err) { return callback(err) }
				if (personId) { return callback('Please use your Dogo app') }
				var expiration = 3 * time.days
				var authToken = secret+':'+conversationId+':'+personIndex
				redis.setex(createSession.guestPrefix+authToken, expiration, 1, function(err) {
					if (err) { return callback(err) }
					callback(null, {
						people:people,
						sessionInfo: {
							address:Addresses.address(addrInfo.addressType, addrInfo.addressId, addrInfo.name),
							authorization:'DogoGuest '+authToken,
							config:getClientConfig()
						}
					})
				})
			})
		})
	})
}

function createSession(addrInfo, password, callback) {
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
				log('make uid')
				makeUid(60, function(err, secret) {
					if (err) { return callback(err) }
					log('insert session in db')
					var clientInfo = { foo:'bar' }
					var sql = 'INSERT INTO session SET personId=?, secret=?, clientInfoJson=?'
					db.person(personId).insert(sql, [personId, secret, JSON.stringify(clientInfo)], function(err, sessionId) {
						if (err) { return callback(err) }
						var expiration = 1 * time.day
						var authToken = secret+':'+sessionId
						log('add session to redis')
						redis.setex(createSession.personPrefix+authToken, expiration, personId, function(err) {
							if (err) { return callback(err) }
							log.debug('bump client uid block')
							bumpClientUidBlock(personId, function(err, clientUidBlock) {
								if (err) { return callback(err) }
								var sessionInfo = {
									authorization:'DogoPerson '+authToken,
									person:person,
									clientUidBlock:clientUidBlock,
									config:getClientConfig()
								}
								log.debug('session created', sessionInfo)
								callback(null, sessionInfo)
							})
						})
					})
				})
			})
		})
	})
}
