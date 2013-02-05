var bcrypt = require('bcrypt')

module.exports = {
	createHash:createHash,
	checkAgainstHash:checkAgainstHash
}

function createHash(password, callback) {
	var numHashRounds = 100
	bcrypt.hash(password, numHashRounds, callback)
}

function checkAgainstHash(password, passwordHash, callback) {
	bcrypt.compare(password, passwordHash, function(err, passwordIsCorrect) {
		callback(err || (passwordIsCorrect ? null : 'Incorrect password'), null)
	})
}
