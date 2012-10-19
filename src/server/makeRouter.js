var express = require('express')
var SessionService = require('./SessionService')
var fs = require('fs')
var path = require('path')
var curry = require('std/curry')
var slice = require('std/slice')
var http = require('http')
var semver = require('semver')
var log = require('./util/log').makeLog('Router')

require('color')

module.exports = function makeRouter(accountService, messageService, sessionService, pictureService, opts) {
	
	var app = express()
	app.use(express.bodyParser({ limit:'8mb' }))
	var server = http.createServer(app)
	
	respond.log = (opts.log || opts.dev)
	
	setupRoutes(app, accountService, messageService, sessionService, pictureService, opts)
	if (opts.dev) { setupDev(app) }
	app.get('*', function onError(req, res, next) { respond(req, res, 404) })
	app.post('*', function onError(req, res, next){ respond(req, res, 404) })
	
	return {
		listen:function(port) {
			server.listen(port)
			log("dogo-web listening on :"+port)
		}
	}
}

function setupRoutes(app, accountService, messageService, sessionService, pictureService, opts) {
	var filter = {
		oldClients: function filterOldClient(req, res, next) {
			var client = req.headers['x-dogo-client']
			if (semver.lt(client, '0.96.0-_')) {
				res.writeHead(400, {
					'x-dogo-process': 'alert("You have an outdated client. Please upgrade to the most recent version.")'
				})
				res.end()
				return
			}
			next()
		},
		session: function filterSession(req, res, next) {
			sessionService.authenticateRequest(req, function(err, accountId) {
				if (err) { return next(err) }
				if (!accountId) { return next('Unauthorized') }
				req.session = { accountId:accountId }
				next()
			})
		}
	}
	filter.oldClientsAndSession = [filter.oldClients, filter.session]
	
	app.get('/api/ping', function(req, res) {
		res.end('"Dogo!"')
	})
	app.post('/api/session', filter.oldClients, function postSession(req, res) {
		var timer = makeTimer('postSessionHandler').start('getParams')
		var params = getParams(req, 'facebookAccessToken', 'facebookRequestId')
		if (params.facebookRequestId) { return respond(req, res, "Sessions for facebook requests is not ready yet. Sorry!") }
		timer.stop('getParams')
		sessionService.createSession(makeRequestMeta(req, { timer:timer }), params.facebookAccessToken, curry(respond, req, res))
	})
	// app.get('/api/session', filter.oldClients, function getSession(req, res) {
	// 	var params = getParams(req, 'authToken')
	// 	sessionService.getSession(params.authToken, curry(respond, req, res))
	// })
	app.get('/api/conversations', filter.oldClientsAndSession, function getConversations(req, res) {
		var params = getParams(req)
		messageService.getConversations(req.session.accountId, wrapRespond(req, res, 'conversations'))
	})
	// app.get('/api/contacts', filter.oldClientsAndSession, function getContacts(req, res) {
	// 	var params = getParams(req)
	// 	accountService.getContacts(req.session.accountId, wrapRespond(req, res, 'contacts'))
	// })
	app.post('/api/message', filter.oldClientsAndSession, function postMessage(req, res) {
		var params = getParams(req, 'toConversationId', 'toPersonId', 'clientUid', 'body', 'picture')
		var prodPush = (req.headers['x-dogo-mode'] == 'appstore')
		messageService.sendMessage(req.session.accountId,
			params.toConversationId, params.toPersonId, params.clientUid,
			params.body, params.picture,
			prodPush, curry(respond, req, res))
	})
	app.get('/api/messages', filter.oldClientsAndSession, function getConversationMessages(req, res) {
		var params = getParams(req, 'conversationId')
		messageService.getMessages(req.session.accountId, params.conversationId, wrapRespond(req, res, 'messages'))
	})
	app.post('/api/push_auth', filter.oldClientsAndSession, function postPushAuth(req, res) {
		var params = getParams(req, 'pushToken', 'pushSystem')
		accountService.setPushAuth(req.session.accountId, params.pushToken, params.pushSystem,
			curry(respond, req, res))
	})
	app.get('/api/account_info', filter.oldClientsAndSession, function getAccountInfo(req, res) {
		var params = getParams(req, 'accountId', 'facebookId')
		accountService.getAccount(params.accountId, params.facebookId, wrapRespond(req, res, 'account'))
	})
	app.get('/api/image', filter.oldClientsAndSession, function getPicture(req, res) {
		var params = getParams(req, 'conversationId', 'pictureId', 'pictureSecret')
		pictureService.getPictureUrl(req.session.accountId, params.conversationId, params.pictureId, params.pictureSecret, function(err, url) {
			if (err) { return respond(req, res, err) }
			res.redirect(url)
		})
	})
	app.get('/api/version/info', filter.oldClientsAndSession, function getVersionInfo(req, res) {
		var url = null // 'http://marcus.local:9000/api/version/download/latest.tar'
		respond(req, res, null, { url:url })
	})
	app.get('/api/version/download/*', filter.session, function downloadVersion(req, res) {
		res.writeHead(204)
		res.end()
		return
		log('download version', req.url)
		fs.readFile(__dirname+'/../../build/dogo-ios-build.tar', bind(this, function(err, tar) {
			if (err) { return respond(req, res, err) }
			log("send download response", tar.length)
			respond(req, res, null, tar, 'application/x-tar')
		}))
	})
	app.get('/api/facebook_canvas/conversation', function getFacebookConversation(req, res) {
		var params = getParams(req, 'facebookRequestId')
		messageService.loadFacebookRequestId(params.facebookRequestId, curry(respond, req, res))
	})
	app.post('/api/facebook_requests', filter.session, function saveFacebookRequest(req, res) {
		var params = getParams(req, 'facebookRequestId', 'toAccountId', 'conversationId')
		messageService.saveFacebookRequest(req.session.accountId, params.facebookRequestId, params.toAccountId, params.conversationId, curry(respond, req, res))
	})
}

function makeRequestMeta(req, opts) {
	opts = options(opts, {
		timer:makeTimer.dummy
	})
	if (typeof opts.timer == 'string') {
		opts.timer = makeTimer(opts.timer)
	}
	return opts
}

function setupDev(app) {
	var combine = require('../combine')
	var buildPage = require('../website/build-page')
	
	app.get('/', sendPage('homepage'))
	app.all(/^\/facebook_canvas*/, sendPage('facebook_canvas'))
	app.get('/terms', sendPage('terms'))
	app.get('/privacy', sendPage('privacy'))
	app.get('/identity', sendPage('identity'))
	app.get('/test', sendPage('test'))
	
	app.get('/app', sendFile('src/client/dogo.html', 'text/html'))
	app.get('/favicon.ico', sendFile('src/graphics/website/favicon.png', 'image/png'))
		
	app.get('/fonts/*', sendStatic('src'))
	app.get('/lib/*', sendStatic('src'))
	app.get('/graphics/*', sendStatic('src'))
	
	app.get('/stylus/*', function(req, res) {
		combine.compileStylusPath(req.path, {}, curry(respondCss, req, res))
	})
	
	app.get('/require/*', function(req, res) {
		combine.handleRequireRequest(req, res)
	})
	
	each(['BTImage'], function(btModule) {
		require('../../dependencies/blowtorch/sdk/blowtorch-node-sdk/'+btModule).setup(app)
	})
	
	function sendPage(name) {
		return function(req, res) {
			buildPage(name, curry(respondHtml, req, res))
		}
	}
	
	function sendStatic(prefix) {
		return function(req, res) {
			fs.readFile(prefix+req.url, curry(respond, req, res))
		}
	}
	
	function sendFile(path, contentType) {
		return function (req, res) {
			fs.readFile(path, function(err, content) {
				respond(req, res, err, content, contentType)
			})
		}
	}
}


function getParams(req) {
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
	
	log(req.method, req.url, req.meta, logParams)
	return params
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
	try {
	var code = 200, headers = {}
	if (err) {
		if (err === 'Unauthorized') {
			code = 401
			content = 'Authorization Required'
			headers['WWW-Authenticate'] = 'Basic'
			log.warn("Unauthorized".red, req.url.pink)
		} else if (err == 404) {
			code = 404
			content = 'Could not find ' + req.url
			contentType = 'text/plain'
			log.warn('404', req.url)
		} else {
			var stackError = new Error()
			code = 500
			content = err.stack || err.message || (err.toString && err.toString()) || err
			if (respond.log) {
				var logBody = JSON.stringify(req.body)
				if (logBody && logBody.length > 400) { logBody = logBody.substr(0, 400) + ' (......)' }
				log.warn('error', content, req.url, logBody, stackError.stack)
			}
		}
		contentType = 'text/plain'
	} else {
		if (req.url.match(/\.html$/)) {
			contentType = 'text/html'
		} else if (req.url.match(/\.js$/)) {
			contentType = 'application/javascript'
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
	if (contentType == 'application/json') {
		headers['Cache-Control'] = 'no-cache'
	}
	
	res.writeHead(code, headers)
	res.end(content)
	} catch(e) {
		log.warn("Error sending message", e.stack || e)
		try { res.end("Error sending message") }
		catch(e) { log.error("COULD NOT RESPOND") }
	}
	log('Responded', req.method, req.url, req.meta)
}
