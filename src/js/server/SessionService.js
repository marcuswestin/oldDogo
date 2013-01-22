var uuid = require('uuid')
var makeRedisClient = require('redis').createClient
var time = require('std/time')
var facebook = require('server/util/facebook')
var log = makeLog('SessionService')
var accountService = require('server/AccountService')
var db = require('server/Database')
var payloads = require('data/payloads')

module.exports = {
	createSession:createSession,
	createSessionForPersonId:createSessionForPersonId, // used by create-session.js utility script
	authenticateRequest:authenticateRequest
}

var redis = makeRedisClient()

function createSession(req, fbAccessToken, callback) {
	if (fbAccessToken) {
		req.timer.start('get /me from facebook')
		facebook.get('/me', { access_token:fbAccessToken }, function(err, fbAccount) {
			req.timer.stop('get /me from facebook')
			if (err) { return logError(err, callback, '_handleFacebookAccount', fbAccessToken) }
			if (!fbAccount) { return logError('Facebook did not return information for user', callback, { fbAccessToken:fbAccessToken }) }
			req.timer.start('lookupOrCreateByFacebookAccount')
			accountService.lookupOrCreateByFacebookAccount(req, fbAccount, fbAccessToken, function(err, person) {
				req.timer.stop('lookupOrCreateByFacebookAccount')
				if (err) { return logError(err, callback, 'createSession.lookupOrCreateByFacebookAccount', person) }
				req.timer.start('createSessionForPersonId')
				createSessionForPersonId(person.id, function(err, authToken) {
					req.timer.stop('createSessionForPersonId')
					if (err) { return logError(err, callback, 'createSession.createSessionForPersonId', person.id) }
					req.timer.start('bumpClientUidBlock')
					accountService.bumpClientUidBlock(person.id, function(err, clientUidBlock) {
						req.timer.stop('bumpClientUidBlock').report()
						var sessionInfo = {
							authToken:authToken,
							person:person,
							clientUidBlock:clientUidBlock,
							picturesBucket:payloads.bucket
						}
						callback(null, sessionInfo)
					})
				})
			})
		})
	// } else if (fbRequestId) {
	// 	this.db.selectOne(this,
	// 		'SELECT toPersonId FROM facebookRequest WHERE facebookRequestId=? AND responseTime IS NULL',
	// 		[fbRequestId], function(err, res) {
	// 			if (err) { return callback(err) }
	// 			if (!res) { return callback("This facebook request has already been responded to. Download Dogo to continue!") }
	// 			this.createSessionAndGetConversations(res.toPersonId, null, callback)
	// 		}
	// 	)
	} else {
		callback('Missing facebook access token')
	}
}

function authenticateRequest(req, callback) {
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
	
	redis.get('sess:'+authToken, function(err, personId) {
		if (err) { return callback(err) }
		if (!personId) { return callback('Unauthorized') }
		callback(null, personId)
	})
}


function createSessionForPersonId(personId, callback) {
	var authToken = uuid.v4(),
		expiration = 1 * time.day
	
	redis.setex('sess:'+authToken, expiration, personId, function(err) {
		if (err) { return callback(err) }
		callback(null, authToken)
	})
}
