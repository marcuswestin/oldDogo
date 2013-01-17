var uuid = require('uuid')
var redis = require('redis')
var time = require('std/time')
var facebook = require('./util/facebook')
var log = makeLog('SessionService')
var pictures = require('data/pictures')

module.exports = proto(null,
	function(db, accountService) {
		this.db = db
		this.accountService = accountService
		this._redis = redis.createClient()
	}, {
		createSession: function(req, fbAccessToken, callback) {
			if (fbAccessToken) {
				req.timer.start('get /me from facebook')
				facebook.get('/me', { access_token:fbAccessToken }, bind(this, function(err, fbAccount) {
					req.timer.stop('get /me from facebook')
					if (err) { return logError(err, callback, '_handleFacebookAccount', fbAccessToken) }
					if (!fbAccount) { return logError('Facebook did not return information for user', callback, { fbAccessToken:fbAccessToken }) }
					req.timer.start('lookupOrCreateByFacebookAccount')
					this.accountService.lookupOrCreateByFacebookAccount(req, fbAccount, fbAccessToken, bind(this, function(err, person) {
						req.timer.stop('lookupOrCreateByFacebookAccount')
						if (err) { return logError(err, callback, 'createSession.lookupOrCreateByFacebookAccount', person) }
						req.timer.start('createSessionForPersonId')
						this.createSessionForPersonId(person.id, bind(this, function(err, authToken) {
							req.timer.stop('createSessionForPersonId')
							if (err) { return logError(err, callback, 'createSession.createSessionForPersonId', person.id) }
							req.timer.start('bumpClientUidBlock')
							this.accountService.bumpClientUidBlock(person.id, bind(this, function(err, clientUidBlock) {
								req.timer.stop('bumpClientUidBlock').report()
								var sessionInfo = {
									authToken:authToken,
									person:person,
									clientUidBlock:clientUidBlock,
									picturesBucket:pictures.bucket
								}
								callback(null, sessionInfo)
							}))
						}))
					}))
				}))
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
		},
		// getSession: function(authToken, callback) {
		// 	this._authenticateSession(authToken, bind(this, function(err, personId) {
		// 		if (err) { return callback(err) }
		// 		this.accountService.getPerson(personId, null, bind(this, function(err, person) {
		// 			if (err) { return callback(err) }
		// 			this._finishCreateSession(authToken, personId, person, callback)
		// 		}))
		// 	}))
		// },
		// _finishCreateSession: function(authToken, personId, person, callback) {
		// 	this.accountService.getConversations(personId, bind(this, function(err, conversations) {
		// 		if (err) { return logError(err, callback, 'createSession.getContacts') }
		// 	}))
		// },
		createSessionForPersonId: function(personId, callback) {
			var authToken = uuid.v4(),
				expiration = 1 * time.day
			
			this.setex('sess:'+authToken, expiration, personId, function(err) {
				if (err) { return callback(err) }
				callback(null, authToken)
			})
		},
		authenticateRequest: function(req, callback) {
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
			
			this.get('sess:'+authToken, function(err, personId) {
				if (err) { return callback(err) }
				if (!personId) { return callback('Unauthorized') }
				callback(null, personId)
			})
		},
		setex:function(key, exp, val, cb) {
			var stackTrace = new Error(),
				self = this
			this._redis.setex(key, exp, val, function(err, data) {
				if (err) { log.warn("redis setex error", key, exp, val, stackTrace.stack) }
				cb.call(self, err, data)
			})
		},
		get:function(key, cb) {
			var stackTrace = new Error(),
				self = this
			this._redis.get(key, function(err, data) {
				if (err) { log.warn("redis get error", key, exp, val, stackTrace.stack) }
				cb.call(self, err, data)
			})
		}
	}
)
