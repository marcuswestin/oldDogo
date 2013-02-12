var bcrypt = require('bcrypt')
var log = makeLog('password')

module.exports = function createPasswordHash(password, callback) {
	log('create hash')
	var numHashRounds = 10
	bcrypt.hash(password, numHashRounds, function(err, hash) {
		log.debug('create hash done')
		callback(err, hash)
	})
}
