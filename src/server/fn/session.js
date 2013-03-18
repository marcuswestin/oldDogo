var facebook = require('server/util/facebook')
var log = makeLog('session')
var bcrypt = require('bcrypt')
var getPerson = require('server/fn/getPerson')

module.exports = {
	create:createSession,
	authenticateRequest:authenticateRequest
}

