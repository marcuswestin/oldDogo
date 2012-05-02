var express = require('express'),
	SessionService = require('./SessionService'),
	fs = require('fs'),
	path = require('path'),
	curry = require('std/curry'),
	slice = require('std/slice')

module.exports = proto(null,
	function(accountService, messageService, sessionService, opts) {
		this.accountService = accountService
		this.sessionService = sessionService
		this.messageService = messageService
		this._opts = opts
		this._router = express.createServer()
		this._configureRouter(opts || {})
		this._createRoutes()
	}, {
		listen:function(port) {
			if (!port) { throw new Error("Router expected a port") }
			this._router.listen(port)
			console.log("dogo-web listening on :"+port)
		},
		_configureRouter:function() {
			var router = this._router
			if (this._opts.log) { router.use(express.logger({ format: ':method :url' })) }
			router.use(express.bodyParser())
		},
		_createRoutes: function() {
			var rest = this.rest,
				filter = this.filters,
				misc = this.misc,
				dev = this.dev,
				router = this._router
			
			router.error(misc.error.bind(this))
			
			if (this._opts.dev) {
				var devServer = require('fun/src/dev-server'),
					filename = path.join(__dirname, '../client/dogo.fun'),
					opts = { minify:false }
				devServer.mountAndWatchFile(router, filename, opts)
				router.get('/', devServer.serveDevClient)
				router.get('/app.html', bind(this, function(req, res) {
					devServer.compileFile(filename, opts, curry(devServer.respond, res))
				}))
			} else {
				router.get('/', misc.ping)
			}
			
			router.get('/api/ping', misc.ping)
			router.post('/api/sessions', rest.postSessions.bind(this))
			router.post('/api/sessions/refresh', rest.refreshSession.bind(this))
			// router.post('/api/conversations', filter.session.bind(this), rest.postConversation.bind(this))
			router.get('/api/conversations', filter.session.bind(this), rest.getConversations.bind(this))
			router.get('/api/contacts', filter.session.bind(this), rest.getContacts.bind(this))
			router.post('/api/messages', filter.session.bind(this), rest.postMessage.bind(this))
			router.get('/api/messages', filter.session.bind(this), rest.getConversationMessages.bind(this))
			router.post('/api/push_auth', filter.session.bind(this), rest.postPushAuth.bind(this))
		},
		redirect:function(path) {
			return function(req, res) { res.redirect(path) }
		},
		_getParams:function(req) {
			var argNames = slice(arguments, 1)
			var params = {}
			for (var i=0, argName; argName=argNames[i]; i++) {
				params[argName] = req.body[argName] || req.param(argName)
				if (params[argName] == 'null') {
					delete params[argName]
				}
			}
			return params
		},
		rest: {
			postAuthentication: function(req, res, next) {
				var params = this._getParams(req, 'phone_number')
				this.sessionService.createAuthentication(params.phone_number, bind(this, this.respond, req, res))
			},
			postSessions: function(req, res) {
				var params = this._getParams(req, 'facebook_access_token')
				this.sessionService.createSessionWithFacebookAccessToken(params.facebook_access_token, bind(this, this.respond, req, res))
			},
			refreshSession: function(req, res) {
				var params = this._getParams(req, 'authToken')
				this.sessionService.refreshSessionWithAuthToken(params.authToken, bind(this, this.respond, req, res))
			},
			getConversations: function(req, res) {
				this.messageService.listConversations(req.session.accountId, bind(this, this.respond, req, res))
			},
			getContacts: function(req, res) {
				this.accountService.getContacts(req.session.accountId, bind(this, this.respond, req, res))
			},
			postMessage: function(req, res) {
				var params = this._getParams(req, 'toFacebookId', 'to_facebook_account_id', 'toAccountId', 'body', 'devPush')
				var facebookId = params.toFacebookId || params.to_facebook_account_id // backcompat
				var isProd = (req.headers['x-dogo-mode'] == 'appstore')
				this.messageService.sendMessage(req.session.accountId, facebookId, params.toAccountId, params.body, !isProd, bind(this, this.respond, req, res))
			},
			getConversationMessages: function(req, res) {
				var params = this._getParams(req, 'withFacebookId', 'withAccountId')
				this.messageService.getMessages(req.session.accountId, params.withFacebookId, params.withAccountId, bind(this, this.respond, req, res))
			},
			postPushAuth: function(req, res) {
				var params = this._getParams(req, 'pushToken', 'pushSystem')
				this.accountService.setPushAuth(req.session.accountId, params.pushToken, params.pushSystem, bind(this, this.respond, req, res))
			}
		},
		misc: {
			ping: function(req, res) {
				res.end('"Dogo!"')
			},
			error: function(err, req, res) {
				this.respond(req, res, err)
			}
		},
		filters: {
			session: function(req, res, next) {
				this.sessionService.authenticateRequest(req, function(err, accountId) {
					if (err) { return next(err) }
					req.session = { accountId:accountId }
					next()
				})
			}
		},
		respond:function(req, res, err, content, contentType) {
			try {
			var code = 200, headers = {}
			if (err) {
				if (err === 'Unauthorized') {
					code = 401
					content = 'Authorization Required'
					headers['WWW-Authenticate'] = 'Basic'
				} else {
					code = 500
					content = err.stack || err.message || err.toString()
					if (this._opts.log || this._opts.dev) {
						console.warn('error', content, req.url, req.body)
					}
				}
			}
			
			if (!contentType) {
				contentType = 'application/json'
			}
			
			if (contentType == 'application/json') {
				content = JSON.stringify(content)
			}
			
			headers['Content-Type'] = contentType
			// headers['Content-Length'] = content.length
			
			res.writeHead(code, headers)
			res.end(content)
			} catch(e) {
				res.end("Error sending message")
			}
		}
	}
)
