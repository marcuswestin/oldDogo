require('../server/util/globals')

var SessionService = require('../server/SessionService')

var dogoId = process.argv[2]

new SessionService().createSessionForDogoId(dogoId, function(err, authToken) {
	if (err) { return console.error('error:', err) }
	console.log("Created session for account", dogoId, "with authToken", authToken)
	process.exit(0)
})
