var express = require('express'),
	SessionService = require('./SessionService'),
	fs = require('fs'),
	path = require('path'),
	curry = require('std/curry')

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
		},
		redirect:function(path) {
			return function(req, res) { res.redirect(path) }
		},
		_cleanBody:function(req) {
			var body = req.body
			for (var key in body) {
				if (body.hasOwnProperty(key) && body[key] == 'null') {
					delete body[key]
				}
			}
			return body
		},
		rest: {
			postAuthentication: function(req, res, next) {
				var body = this._cleanBody(req)
				this.sessionService.createAuthentication(body.phone_number, bind(this, this.respond, req, res))
			},
			postSessions: function(req, res) {
				var body = this._cleanBody(req)
				this.sessionService.createSessionWithFacebookAccessToken(body.facebook_access_token, bind(this, this.respond, req, res))
			},
			refreshSession: function(req, res) {
				var body = this._cleanBody(req)
				this.sessionService.refreshSessionWithAuthToken(body.authToken, bind(this, this.respond, req, res))
			},
			// postConversation: function(req, res) {
			// 	var body = req.body
			// 	if (!body.with_facebook_account_id) { return this.respond('Missing fb account id') }
			// 	this.messageService.createConversation(req.session.accountId, body.with_facebook_account_id, bind(this, this.respond, req, res))
			// },
			getConversations: function(req, res) {
				var body = this._cleanBody(req)
				this.messageService.listConversations(req.session.accountId, bind(this, this.respond, req, res))
			},
			getContacts: function(req, res) {
				this.accountService.getContacts(req.session.accountId, bind(this, this.respond, req, res))
			},
			postMessage: function(req, res) {
				var body = this._cleanBody(req)
				var facebookId = body.toFacebookId || body.to_facebook_account_id // backcompat
				this.messageService.sendMessage(req.session.accountId, facebookId, body.toAccountId, body.body, bind(this, this.respond, req, res))
			},
			getConversationMessages: function(req, res) {
				var withFacebookId = req.param('withFacebookId'),
					withAccountId = req.param('withAccountId')
				this.messageService.getMessages(req.session.accountId, withFacebookId, withAccountId, bind(this, this.respond, req, res))
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
