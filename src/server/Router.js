var express = require('express')
var SessionService = require('./SessionService')
var fs = require('fs')
var path = require('path')
var curry = require('std/curry')
var slice = require('std/slice')
var http = require('http')
var semver = require('semver')

require('color')

var _opts

module.exports = proto(null,
	function(accountService, messageService, sessionService, pictureService, opts) {
		_opts = opts
		this.accountService = accountService
		this.sessionService = sessionService
		this.messageService = messageService
		this.pictureService = pictureService
		this._router = express()
		this._server = http.createServer(this._router)
		this._configureRouter(_opts || {})
		if (_opts.dev) {
			this._setupDev(this._router, this._server)
		}
		this._createRoutes()
	}, {
		listen:function(port) {
			if (!port) { throw new Error("Router expected a port") }
			this._server.listen(port)
			console.log("dogo-web listening on :"+port)
		},
		_configureRouter:function() {
			var router = this._router
			// if (_opts.log) { router.use(express.logger({ format: ':method :url' })) }
			router.use(express.bodyParser())
		},
		_createRoutes: function() {
			var filter = this.filters,
				rest = this.rest,
				router = this._router
			
			router.get('/api/ping', function(req, res) { res.end('"Dogo!"') })
			router.post('/api/sessions', rest.postSessions.bind(this))
			router.post('/api/sessions/refresh', rest.refreshSession.bind(this))
			// router.post('/api/conversations', filter.session.bind(this), rest.postConversation.bind(this))
			router.get('/api/conversations', filter.session.bind(this), rest.getConversations.bind(this))
			router.get('/api/contacts', filter.session.bind(this), rest.getContacts.bind(this))
			router.post('/api/messages', filter.session.bind(this), rest.postMessage.bind(this))
			router.get('/api/messages', filter.session.bind(this), rest.getConversationMessages.bind(this))
			router.post('/api/push_auth', filter.session.bind(this), rest.postPushAuth.bind(this))
			router.get('/api/account_info', filter.session.bind(this), rest.getAccountInfo.bind(this))
			router.get('/api/image', filter.session.bind(this), rest.getPicture.bind(this))
			router.get('/api/version/info', filter.session.bind(this), rest.getVersionInfo.bind(this))
			router.get('/api/version/download/*', filter.session.bind(this), rest.downloadVersion.bind(this))
			router.get('/api/facebook_canvas/conversation', rest.getFacebookConversation.bind(this))
			router.post('/api/facebook_requests', filter.session.bind(this), rest.saveFacebookRequest.bind(this))
			
			// router.get('/website*', bind(this, function(req, res) {
			// 	var file = path.join(__dirname, '..', req.url.replace(/\.\./g, '').replace(/\^\/web\//, ''))
			// 	fs.readFile(file, bind(this, this.respondHtml, req, res))
			// }))
			// 
			// router.get('/api/fubar', function(req, res) {
			// 	res.writeHead(200, { 'X-Dogo-Process':'alert("foobar")' })
			// 	res.end('hi!')
			// })
			// router.all('/facebook_canvas/*', function(req, res) {
			// 	respond(req, res, null, '<div style="font-size:40px;">Hi Jon!</div>', 'text/html')
			// })
			

			router.use(function onError(err, req, res, next){
				console.log("ERROR".red, err)
				respond(req, res, err)
			})
		},
		redirect:function(path) {
			return function(req, res) { res.redirect(path) }
		},
		_getParams:function(req) {
			console.log("Request:", req.url)
			var argNames = slice(arguments, 1)
			var params = {}
			for (var i=0, argName; argName=argNames[i]; i++) {
				params[argName] = req.body[argName] || req.param(argName)
				if (params[argName] == 'null') {
					delete params[argName]
				}
			}
			
			var client = req.headers['x-dogo-client']
			req.meta = {
				accountId: req.session && req.session.accountId,
				client: client
			}
			
			var logParams = JSON.stringify(params)
			if (logParams.length > 250) { logParams = logParams.substr(0, 250) + ' (......)' }
			
			var d = new Date()
			var time = d.getFullYear()+'/'+d.getMonth()+'/'+d.getDate()+'-'+d.getHours()+':'+d.getMinutes()+':'+d.getSeconds()
			console.log(time, req.method, req.url, req.meta, logParams)
			return params
		},
		rest: {
			postAuthentication: function(req, res, next) {
				var params = this._getParams(req, 'phone_number')
				this.sessionService.createAuthentication(params.phone_number, curry(respond, req, res))
			},
			postSessions: function(req, res) {
				var params = this._getParams(req, 'facebookAccessToken', 'facebookRequestId')
				this.sessionService.createSession(params.facebookAccessToken, params.facebookRequestId,
					curry(respond, req, res))
			},
			refreshSession: function(req, res) {
				var params = this._getParams(req, 'authToken')
				this.sessionService.refreshSessionWithAuthToken(params.authToken, curry(respond, req, res))
			},
			getConversations: function(req, res) {
				var params = this._getParams(req)
				this.messageService.listConversations(req.session.accountId, wrapRespond(req, res, 'conversations'))
			},
			saveFacebookRequest: function(req, res) {
				var params = this._getParams(req, 'facebookRequestId', 'toAccountId', 'conversationId')
				this.messageService.saveFacebookRequest(req.session.accountId, params.facebookRequestId, params.toAccountId, params.conversationId, curry(respond, req, res))
			},
			getFacebookConversation: function(req, res) {
				var params = this._getParams(req, 'facebookRequestId')
				this.messageService.loadFacebookRequestId(params.facebookRequestId, curry(respond, req, res))
			},
			getContacts: function(req, res) {
				var params = this._getParams(req)
				this.accountService.getContacts(req.session.accountId, wrapRespond(req, res, 'contacts'))
			},
			postMessage: function(req, res) {
				var params = this._getParams(req, 'toFacebookId', 'toAccountId', 'body', 'base64Picture', 'pictureWidth', 'pictureHeight', 'picWidth', 'picHeight', 'devPush')
				var prodPush = (req.headers['x-dogo-mode'] == 'appstore')
				if (!params.pictureWidth) { params.pictureWidth = 920 }
				if (!params.pictureHeight) { params.pictureHeight = 640 }
				this.messageService.sendMessage(req.session.accountId,
					params.toFacebookId, params.toAccountId, params.body,
					params.base64Picture, params.pictureWidth || params.picWidth, params.pictureHeight || params.picHeight, // backcompat with < july 24 clients
					prodPush, curry(respond, req, res))
			},
			getConversationMessages: function(req, res) {
				var params = this._getParams(req, 'withAccountId', 'withFacebookId')
				
				this.messageService.getMessages(req.session.accountId,
					params.withAccountId, params.withFacebookId,
					wrapRespond(req, res, 'messages'))
			},
			postPushAuth: function(req, res) {
				var params = this._getParams(req, 'pushToken', 'pushSystem')
				this.accountService.setPushAuth(req.session.accountId, params.pushToken, params.pushSystem,
					curry(respond, req, res))
			},
			getAccountInfo: function(req, res) {
				var params = this._getParams(req, 'accountId', 'facebookId')
				this.accountService.getAccount(params.accountId, params.facebookId, wrapRespond(req, res, 'account'))
			},
			getPicture: function(req, res) {
				var params = this._getParams(req, 'conversationId', 'pictureId', 'pictureSecret')
				this.pictureService.getPictureUrl(req.session.accountId, params.conversationId, params.pictureId, params.pictureSecret, function(err, url) {
					if (err) { return respond(req, res, err) }
					res.redirect(url)
				})
			},
			getVersionInfo: function(req, res) {
				var url = null // 'http://marcus.local:9000/api/version/download/latest.tar'
				respond(req, res, null, { url:url })
			},
			downloadVersion: function(req, res) {
				res.writeHead(204)
				res.end()
				return
				console.log('download version', req.url)
				fs.readFile('/build/dogo-ios-build.tar', bind(this, function(err, tar) {
					if (err) { return respond(req, res, err) }
					console.log("send download response", tar.length)
					respond(req, res, null, tar, 'application/x-tar')
				}))
			}
		},
		filters: {
			session: function(req, res, next) {
				this.sessionService.authenticateRequest(req, function(err, accountId) {
					if (err) { return next(err) }
					if (!accountId) { return next('Unauthorized') }
					req.session = { accountId:accountId }
					next()
				})
			}
		},
		_setupDev:function(app, server) {
			var nib = require('nib')
			var combine = require('../combine')
			var time = require('std/time')
			var buildPage = require('../website/build-page')
			
			app.get('/', sendPage('homepage'))
			app.all(/^\/facebook_canvas*/, sendPage('facebook_canvas'))
			app.get('/identity', sendPage('identity'))
			app.get('/test', sendPage('test'))
			
			function sendPage(name) {
				return function(req, res) {
					buildPage(name, curry(respondHtml, req, res))
				}
			}
			
			app.get('/app.html', function(req, res) {
				res.sendfile('src/client/dogo.html')
			})
			
			app.get('/jquery.js', function(req, res) {
				sendFile(res, 'src/client/lib/jquery-1.7.2.js')
			})
			
			function sendFile(res, path) {
				fs.readFile(path, function(err, content) {
					if (err) {
						res.writeHead(500)
						res.end(err.stack || err.message || err.toString())
					} else {
						res.writeHead(200)
						res.end(content.toString())
					}
				})
			}
			
			app.get('/blowtorch/img/*', function(req, res) {
				var path = req.path.replace('/blowtorch/img/', '')
				fs.readFile('src/client/img/'+path, function(err, content) {
					if (err) { return respond(req, res, err) }
					res.writeHead(200, { 'Content-Type':'image/png' })
					res.end(content)
				})
			})

			app.get('/blowtorch/fonts/*', function(req, res) {
				var path = req.path.replace('/blowtorch/fonts/', '')
				fs.readFile('src/client/fonts/'+path, function(err, content) {
					if (err) { return respond(req, res, err) }
					res.writeHead(200, { 'Content-Type':'font/ttf' })
					res.end(content)
				})
			})

			app.get('/static/*', function(req, res) {
				fs.readFile('src/website'+req.url, curry(respond, req, res))
			})
			
			app.get('/stylus/*', function(req, res) {
				combine.compileStylusPath(req.path, {}, curry(respondCss, req, res))
			})
			
			app.get('/require/*', function(req, res) {
				combine.handleRequireRequest(req, res)
			})
			
			// Auto-reload dev client stuff
			// return;
			var serverIo = require('socket.io').listen(server)
			app.get('/dev-client.html', function(req, res) {
				sendFile(res, 'src/client/dev-client.html')
			})
			
			app.get('/test/*', function(req, res) {
				sendFile(res, 'src/client'+req.url)
			})
			
			serverIo.set('log level', 0)
			
			serverIo.sockets.on('connection', function(socket) {
				console.log("Dev client connected")
				fs.readFile('src/client/playground/playground.html', function(err, html) {
					socket.emit('change', { error:err, html:html.toString() })
				})
			})
			
			var lastChange = time.now()
			var onChange = function(event, changedFilename) {
				if (time.now() - lastChange < 1000) { return } // Node bug calls twice per change, see https://github.com/joyent/node/issues/2126
				lastChange = time.now()
				fs.readFile('src/client/playground/playground.html', function(err, html) {
					serverIo.sockets.emit('change', { error:err, html:html.toString() })
				})
			}
			
			var watch = require('watch')
			var watchedFiles = {}
			var walkFiles = function() {
				walk('src/client', function(err, files) {
					files.forEach(function(file) {
						if (watchedFiles[file]) { return }
						var ext = file.split('.').pop()
						if (ext == 'js' || ext == 'styl' || ext == 'html') {
							watchedFiles[file] = true
							fs.watch(file, onChange)
						}
					})
				})
			}
			walkFiles()
			
			// watch.watchTree(__dirname + '/../client/playground', function(f, curr, prev) {
			// 	if (prev) { return } // not new file
			// 	walkFiles()
			// })
		}
	}
)

var walk = function(dir, done) {
	var results = []
	fs.readdir(dir, function(err, list) {
		if (err) return done(err)
		var pending = list.length
		if (!pending) return done(null, results)
		list.forEach(function(file) {
			file = dir + '/' + file
			fs.stat(file, function(err, stat) {
				if (stat && stat.isDirectory()) {
					walk(file, function(err, res) {
						results = results.concat(res)
						if (!--pending) done(null, results)
					})
				} else {
					results.push(file)
					if (!--pending) done(null, results)
				}
			})
		})
	})
}

function wrapRespond(req, res, name) {
	return function(err, data) {
		var response = {}
		response[name] = data
		respond(req, res, err, err ? null : response)
	}
}

function respondHtml(req, res, err, content) {
	respond(req, res, err, !err && content.toString(), 'text/html')
}

function respondCss(req, res, err, content) {
	respond(req, res, err, !err && content.toString(), 'text/css')
}

function respond(req, res, err, content, contentType) {
	console.log("Responding...", req.url)
	try {
	var code = 200, headers = {}
	if (err) {
		if (err === 'Unauthorized') {
			code = 401
			content = 'Authorization Required'
			headers['WWW-Authenticate'] = 'Basic'
			console.warn("Unauthorized".red, req.url.pink)
		} else {
			var stackError = new Error()
			code = 500
			content = err.stack || err.message || (err.toString && err.toString()) || err
			if (_opts.log || _opts.dev) {
				var logBody = JSON.stringify(req.body)
				if (logBody.length > 400) { logBody = logBody.substr(0, 400) + ' (......)' }
				console.warn('error', content, req.url, logBody, stackError.stack)
			}
		}
	} else {
		if (req.url.match(/\.html$/)) {
			contentType = 'text/html'
		}
	}
	
	if (!contentType) {
		if (req.url.match(/\.jpg$/)) {
			contentType = 'image/jpg'
		} else if (req.url.match(/\.png$/)) {
			contentType = 'image/png'
		} else {
			contentType = 'application/json'
		}
	}
	
	if (contentType == 'application/json') {
		content = JSON.stringify(content)
	}
	
	headers['Content-Type'] = contentType
	// headers['Content-Length'] = content.length
	
	res.writeHead(code, headers)
	res.end(content)
	} catch(e) {
		try { res.end("Error sending message") }
		catch(e) { console.log("COULD NOT RESPOND") }
	}
	console.log("Responded", req.url)
}
