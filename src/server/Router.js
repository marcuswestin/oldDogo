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
			
			if (this._opts.log) { router.use(express.logger()) }
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
			
			router.post('/api/authentication', rest.postAuthentication.bind(this))
			router.post('/api/session', rest.postSession.bind(this))
			router.post('/api/conversation', filter.session.bind(this), rest.postConversation.bind(this))
			router.get('/api/conversations', filter.session.bind(this), rest.getConversations.bind(this))
			router.post('/api/messages', filter.session.bind(this), rest.postMessage.bind(this))
		},
		redirect:function(path) {
			return function(req, res) { res.redirect(path) }
		},
		rest: {
			postAuthentication: function(req, res, next) {
				var body = req.body, session = req.session
				this.sessionService.createAuthentication(body.phone_number, bind(this, this.respond, req, res))
			},
			postSession: function(req, res) {
				var body = req.body, session = req.session
				this.sessionService.createSession(body.fb_access_token, bind(this, this.respond, req, res))
			},
			postConversation: function(req, res) {
				var body = req.body, session = req.session
				if (!body.with_fb_account_id) { return this.respond('Missing fb account id') }
				this.messageService.createConversation(session.accountId, body.with_fb_account_id, bind(this, this.respond, req, res))
			},
			getConversations: function(req, res) {
				var body = req.body, session = req.session
				this.messageService.listConversations(session.accountId, bind(this, this.respond, req, res))
			},
			postMessage: function(req, res) {
				var body = req.body, session = req.session
				this.messageService.sendMessage(session.accountId, body.conversation_id, body.body, bind(this, this.respond, req, res))
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
				var authorization = req.headers.authorization
				if (!authorization) { return next('Unauthorized') }
				
				try {
					var parts = authorization.split(' '),
						scheme = parts[0],
						credentials = new Buffer(parts[1], 'base64').toString().split(':'),
						sessionAccountId = credentials[0],
						sessionToken = credentials[1]
				} catch(e) {
					console.warn(e)
					return next('Error parsing basic auth: '+ authorization)
				}
				
			    if (scheme != 'Basic') { return next('Unknown auth scheme - expected "Basic"') }
				
				this.sessionService.authenticateSession(sessionToken, sessionAccountId, function(err, accountId) {
					if (err) { return next(err) }
					req.session = { accountId:accountId }
					next(null)
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
			headers['Content-Length'] = content.length
			
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
