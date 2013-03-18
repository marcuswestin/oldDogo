var crypto = require('crypto')

module.exports = makeUid

function makeUid(numChars, callback) {
	if (numChars % 4 != 0) { return callback('uid length must be a multiple of 4') }
	crypto.randomBytes(numChars / 4 * 3, function(err, bytes) {
		if (err) { return callback(err) }
		callback(null, bytes.toString('base64').replace(/\+/g, '|').replace(/\//g, '_')) // remove + and / for url-safe encoding. = won't occur as we're asking for a multiple of 3 bytes
	})
}
