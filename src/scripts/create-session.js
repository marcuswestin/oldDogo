require('./server/util/globals')

var SessionService = require('./src/server/SessionService')

var accountId = process.argv[2]

new SessionService().createSessionForAccountId(accountId, function(err, authToken) {
	if (err) { return console.error('error:', err) }
	console.log("Created session with auth:", authToken)
	process.exit(0)
})
