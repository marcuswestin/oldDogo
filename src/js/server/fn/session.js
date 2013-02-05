var uuid = require('uuid')
var time = require('std/time')
var facebook = require('server/util/facebook')
var log = makeLog('session')
var payloads = require('data/payloads')
var bcrypt = require('bcrypt')
var getPerson = require('server/fn/getPerson')
var password = require('server/util/password')

module.exports = {
	create:createSession,
	authenticateRequest:authenticateRequest
}

