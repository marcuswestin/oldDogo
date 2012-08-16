var uuid = require('uuid'),
	redis = require('redis'),
	time = require('std/time'),
	facebook = require('./util/facebook')

module.exports = proto(null,
	function(db, accountService) {
		this.db = db
		this.accountService = accountService
		this._redis = redis.createClient()
	}, {
		createSession: function(fbAccessToken, fbRequestId, callback) {
			if (fbAccessToken) {
				facebook.get('me', { access_token:fbAccessToken }, bind(this, function(err, fbAccount) {
					if (err) { return logError(err, callback, '_handleFacebookAccount', fbAccessToken) }
					if (!fbAccount) { return logError('Facebook did not return information for user', callback, { fbAccessToken:fbAccessToken, fbRequestId:fbRequestId }) }
					this.accountService.lookupOrCreateByFacebookAccount(fbAccount, fbAccessToken, bind(this, function(err, account) {
						if (err) { return logError(err, callback, 'createSession.lookupOrCreateByFacebookAccount', account) }
						this.createSessionAndGetContacts(account.accountId, account, callback)
					}))
				}))
			} else if (fbRequestId) {
				this.db.selectOne(this,
					'SELECT to_account_id FROM facebook_request WHERE facebook_request_id=? AND response_time IS NULL',
					[fbRequestId], function(err, res) {
						if (err) { return callback(err) }
						this.createSessionAndGetContacts(res.to_account_id, null, callback)
					}
				)
			} else {
				callback('Missing access token or request id')
			}
		},
		createSessionAndGetContacts: function(accountId, account, callback) {
			this.createSessionForAccountId(accountId, bind(this, function(err, authToken) {
				if (err) { return logError(err, callback, 'createSession.createSessionForAccountId', accountId) }
				this.accountService.getContacts(accountId, bind(this, function(err, contacts) {
					if (err) { return logError(err, callback, 'createSession.getContacts') }
					callback(null, { authToken:authToken, account:account, contacts:contacts })
				}))
			}))
		},
		createSessionForAccountId: function(accountId, callback) {
			var sessionToken = uuid.v4(),
				expiration = 1 * time.day
			
			this.setex('sess:'+sessionToken, expiration, accountId, function(err) {
				if (err) { return callback(err) }
				var authToken = accountId+':'+sessionToken
				callback(null, authToken)
			})
		},
		refreshSessionWithAuthToken: function(authToken, callback) {
			var parts = authToken.split(':')
			this._authenticateSession(parts[1], parts[0], bind(this, function(err, accountId) {
				if (err) { return callback(err) }
				this.accountService.getAccount(accountId, null, function(err, account) {
					if (err) { return callback(err) }
					callback(null, { authToken:authToken, account:account })
				})
			}))
		},
		_authenticateSession: function(sessionToken, sessionAccountId, callback) {
			this.get('sess:'+sessionToken, function(err, accountId) {
				if (err) { return callback(err) }
				if (!accountId || (accountId != sessionAccountId)) { return callback('Unauthorized') }
				callback(null, accountId)
			})
		},
		authenticateRequest: function(req, callback) {
			var authorization = req.headers.authorization || req.param('authorization')
			if (!authorization) { return callback('Unauthorized') }

			try {
				var parts = authorization.split(' ')
				if (parts.length != 2) {
					console.warn('Saw bad auth', authorization)
					return callback('Bad auth')
				}
				
				var scheme = parts[0],
					credentials = new Buffer(parts[1], 'base64').toString().split(':'),
					sessionAccountId = credentials[0],
					sessionToken = credentials[1]
			} catch(e) {
				console.warn(e)
				return callback('Error parsing auth: '+ authorization)
			}

			if (scheme != 'Basic') { return next('Unknown auth scheme - expected "Basic"') }
			
			this._authenticateSession(sessionToken, sessionAccountId, callback)
		},
		setex:function(key, exp, val, cb) {
			var stackTrace = new Error(),
				self = this
			this._redis.setex(key, exp, val, function(err, data) {
				if (err) { console.warn("redis setex error", key, exp, val, stackTrace.stack) }
				cb.call(self, err, data)
			})
		},
		get:function(key, cb) {
			var stackTrace = new Error(),
				self = this
			this._redis.get(key, function(err, data) {
				if (err) { console.warn("redis get error", key, exp, val, stackTrace.stack) }
				cb.call(self, err, data)
			})
		}
	}
)
