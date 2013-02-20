var redis = require('server/redis')

module.exports = function authenticateRequest(req, callback) {
	if (!req.authorization) { return callback('Unauthorized') }

	try {
		var parts = req.authorization.split(' ')
		if (parts.length != 2) {
			log.warn('Saw bad auth', req.authorization)
			return callback('Bad auth')
		}
		
		var scheme = parts[0]
		if (scheme != 'Basic') {
			return callback('Unknown auth scheme - expected "Basic"')
		}
		
		var authToken = new Buffer(parts[1], 'base64').toString()
	} catch(e) {
		log.warn(e)
		return callback('Error parsing auth: '+ req.authorization)
	}
	
	redis.get('sess:'+authToken, function(err, personIdStr) {
		if (err) { return callback(err) }
		var personId = personIdStr && parseInt(personIdStr)
		if (!personId) { return callback('Unauthorized') }
		callback(null, personId)
	})
}

