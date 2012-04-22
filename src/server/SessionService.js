var uuid = require('uuid'),
	redis = require('redis'),
	time = require('std/time'),
	facebook = require('./util/facebook')

module.exports = proto(null,
	function(accountService, addressService, smsService) {
		this.accountService = accountService
		this.addressService = this.accountService.addressService
		this.smsService = smsService
		this._redis = redis.createClient()
	}, {
		createSession: function(fbAccessToken, callback) {
			facebook.get('me', { access_token:fbAccessToken }, bind(this, function(err, res) {
				if (err) { return callback(err) }
				this.accountService.lookupOrCreateByFacebookAccount(res, fbAccessToken, bind(this, function(err, account) {
					if (err) { return callback(err) }
					var sessionToken = uuid.v4(),
						expiration = 1 * time.day
					this.setex('sess:'+sessionToken, expiration, account.id, function(err) {
						if (err) { return callback(err) }
						var session = account.id+':'+sessionToken
						callback(null, { account:account, session:session })
					})
				}))
			}))
		},
		authenticateSession: function(sessionToken, sessionAccountId, callback) {
			this.get('sess:'+sessionToken, function(err, accountId) {
				if (err) { return callback(err) }
				if (!accountId || (accountId != sessionAccountId)) { return callback('Unauthorized') }
				callback(null, accountId)
			})
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
