var uuid = require('uuid'),
	redis = require('redis'),
	time = require('std/time'),
	facebook = require('./util/facebook')

module.exports = proto(null,
	function(accountService) {
		this.accountService = accountService
		this._redis = redis.createClient()
	}, {
		createSessionWithFacebookAccessToken: function(fbAccessToken, callback) {
			facebook.get('me', { access_token:fbAccessToken }, bind(this, function(err, res) {
				if (err) { return logError(err, callback, 'createSessionWithFacebookAccessToken.facebook.get.me', fbAccessToken) }
				this.accountService.lookupOrCreateByFacebookAccount(res, fbAccessToken, bind(this, function(err, account) {
					if (err) { return logError(err, callback, 'createSessionWithFacebookAccessToken.lookupOrCreateByFacebookAccount', account) }
					this.createSessionForAccountId(account.accountId, bind(this, function(err, authToken) {
						if (err) { return logError(err, callback, 'createSessionWithFacebookAccessToken.createSessionForAccountId', account.accountId) }
						this.accountService.getContacts(account.accountId, bind(this, function(err, contacts) {
							if (err) { return logError(err, callback, 'createSessionWithFacebookAccessToken.getContacts') }
							callback(null, { authToken:authToken, account:account, contacts:contacts })
						}))
					}))
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
			var authorization = req.headers.authorization
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
