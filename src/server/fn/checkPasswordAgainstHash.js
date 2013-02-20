var bcrypt = require('bcrypt')

module.exports = function checkPasswordAgainstHash(password, passwordHash, callback) {
	bcrypt.compare(password, passwordHash, function(err, passwordIsCorrect) {
		callback(err || (passwordIsCorrect ? null : 'Incorrect password'), null)
	})
}
