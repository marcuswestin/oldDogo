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
					this.accountService.lookupOrCreateByFacebookAccount(req, fbAccount, fbAccessToken, bind(this, function(err, account) {
						req.timer.stop('lookupOrCreateByFacebookAccount')
						if (err) { return logError(err, callback, 'createSession.lookupOrCreateByFacebookAccount', account) }
						req.timer.start('createSessionForDogoId')
						this.createSessionForDogoId(account.id, bind(this, function(err, authToken) {
							req.timer.stop('createSessionForDogoId')
							if (err) { return logError(err, callback, 'createSession.createSessionForDogoId', account.id) }
							req.timer.start('bumpClientUidBlock')
							this.accountService.bumpClientUidBlock(account.id, bind(this, function(err, clientUidBlock) {
								req.timer.stop('bumpClientUidBlock').report()
								var sessionInfo = {
									authToken:authToken,
									account:account,
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
			// 		'SELECT to_account_id FROM facebook_request WHERE facebook_request_id=? AND response_time IS NULL',
			// 		[fbRequestId], function(err, res) {
			// 			if (err) { return callback(err) }
			// 			if (!res) { return callback("This facebook request has already been responded to. Download Dogo to continue!") }
			// 			this.createSessionAndGetConversations(res.to_account_id, null, callback)
			// 		}
			// 	)
			} else {
				callback('Missing facebook access token')
			}
		},
		// getSession: function(authToken, callback) {
		// 	this._authenticateSession(authToken, bind(this, function(err, dogoId) {
		// 		if (err) { return callback(err) }
		// 		this.accountService.getAccount(dogoId, null, bind(this, function(err, account) {
		// 			if (err) { return callback(err) }
		// 			this._finishCreateSession(authToken, dogoId, account, callback)
		// 		}))
		// 	}))
		// },
		// _finishCreateSession: function(authToken, dogoId, account, callback) {
		// 	this.accountService.getConversations(dogoId, bind(this, function(err, conversations) {
		// 		if (err) { return logError(err, callback, 'createSession.getContacts') }
		// 	}))
		// },
		createSessionForDogoId: function(dogoId, callback) {
			var authToken = uuid.v4(),
				expiration = 1 * time.day
			
			this.setex('sess:'+authToken, expiration, dogoId, function(err) {
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
				if (authToken.indexOf(':') > 0) {
					// backcompat with old session tokens that had <account id>:<auth token>
					authToken = authToken.split(':')[1]
				}
			} catch(e) {
				log.warn(e)
				return callback('Error parsing auth: '+ req.authorization)
			}
			
			this.get('sess:'+authToken, function(err, dogoId) {
				if (err) { return callback(err) }
				if (!dogoId) { return callback('Unauthorized') }
				callback(null, dogoId)
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
