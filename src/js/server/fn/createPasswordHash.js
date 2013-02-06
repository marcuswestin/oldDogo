var bcrypt = require('bcrypt')

module.exports = function createPasswordHash(password, callback) {
	var numHashRounds = 10
	bcrypt.hash(password, numHashRounds, callback)
}
