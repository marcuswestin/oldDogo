var express = require('express'),
	SessionService = require('./SessionService'),
	fs = require('fs')

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
			if (!port) { port = process.env.PORT || 9090 }
			this._router.listen(port)
			if (this._opts.log) { console.log("Listening on :"+port) }
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
				router = this._router
			
			router.error(misc.error.bind(this))
			router.get('/', this.redirect('/app.html'))
			router.get('/app.html', misc.app.bind(this))
			router.get('/claim', misc.claim.bind(this))
			router.get('/api/ping', misc.ping)
			
			router.post('/api/sessions', rest.postSessions.bind(this))
			router.post('/api/sessions/refresh', rest.refreshSession.bind(this))
			router.post('/api/conversations', filter.session.bind(this), rest.postConversation.bind(this))
			router.get('/api/conversations', filter.session.bind(this), rest.getConversations.bind(this))
			router.get('/api/contacts', filter.session.bind(this), rest.getContacts.bind(this))
			router.post('/api/messages', filter.session.bind(this), rest.postMessage.bind(this))
		},
		redirect:function(path) {
			return function(req, res) { res.redirect(path) }
		},
		rest: {
			postAuthentication: function(req, res, next) {
				var body = req.body
				this.sessionService.createAuthentication(body.phone_number, bind(this, this.respond, req, res))
			},
			postSessions: function(req, res) {
				var body = req.body
				this.sessionService.createSessionWithFacebookAccessToken(body.facebook_access_token, bind(this, this.respond, req, res))
			},
			refreshSession: function(req, res) {
				var body = req.body
				this.sessionService.refreshSessionWithAuthToken(body.authToken, bind(this, this.respond, req, res))
			},
			postConversation: function(req, res) {
				var body = req.body
				if (!body.with_facebook_account_id) { return this.respond('Missing fb account id') }
				this.messageService.createConversation(req.session.accountId, body.with_facebook_account_id, bind(this, this.respond, req, res))
			},
			getConversations: function(req, res) {
				var body = req.body
				this.messageService.listConversations(req.session.accountId, bind(this, this.respond, req, res))
			},
			getContacts: function(req, res) {
				this.accountService.getContacts(req.session.accountId, bind(this, this.respond, req, res))
			},
			postMessage: function(req, res) {
				var body = req.body
				this.messageService.sendMessage(req.session.accountId, body.to_facebook_account_id, body.body, bind(this, this.respond, req, res))
			}
		},
		misc: {
			ping: function(req, res) {
				res.end('"pong"')
			},
			error: function(err, req, res) {
				this.respond(req, res, err)
			},
			claim: function(req, res) {
				fs.readFile(__dirname + '/../client/claim.html', bind(this, function(err, html) {
					this.respond(req, res, err, html && html.toString(), 'text/html')
				}))
			},
			app: function(req, res) {
				var compiler = require('fun/src/compiler')
				compiler.compileFile(__dirname + '/../client/dogo.fun', { minify:false }, function(e, appHtml) {
					if (e) { res.end(errorHtmlResponse(e)) }
					else { res.end(appHtml + reloadButtonHTML()) }
				})
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
		}
	}
)

function errorHtmlResponse(e) {
	return ['<!doctype html>','<body>',
		reloadButtonHTML(),
		'<pre>',
		e.stack ? e.stack : e.message ? e.message : e.toString(),
		'</pre>'
	].join('\n')
}

function reloadButtonHTML() {
	return '<div style="width:15px; background:red; text-align:center; position:fixed; top:3px; right:3px; opacity:0.75; cursor:pointer;" ontouchstart="location.reload();" onclick="location.reload()">r</div>'
}
