require('../server/util/globals')

var SessionService = require('../server/SessionService')

var personId = process.argv[2]

new SessionService().createSessionForPersonId(personId, function(err, authToken) {
	if (err) { return console.error('error:', err) }
	console.log("Created session for person", personId, "with authToken", authToken)
	process.exit(0)
})
