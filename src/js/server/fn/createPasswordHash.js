var bcrypt = require('bcrypt')
var log = makeLog('password')

module.exports = function createPasswordHash(password, callback) {
	var numHashRounds = 10
	log.debug('create hash')
	bcrypt.hash(password, numHashRounds, function(err, hash) {
		log.debug('create hash done')
		callback(err, hash)
	})
}
