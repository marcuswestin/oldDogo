var express = require('express')
var SessionService = require('./SessionService')
var fs = require('fs')
var path = require('path')
var curry = require('std/curry')
var slice = require('std/slice')
var http = require('http')
var semver = require('semver')

require('color')

module.exports = function makeRouter(accountService, messageService, sessionService, pictureService, opts) {
	
	var app = express()
	app.use(express.bodyParser({ limit:'8mb' }))
	var server = http.createServer(app)
	
	respond.log = (opts.log || opts.dev)
	
	setupRoutes(app, accountService, messageService, sessionService, pictureService, opts)
	if (opts.dev) { setupDev(app) }
	
	return {
		listen:function(port) {
			server.listen(port)
			console.log("dogo-web listening on :"+port)
		}
	}
}

function setupRoutes(app, accountService, messageService, sessionService, pictureService, opts) {
	var filter = {
		oldClients: function filterOldClient(req, res, next) {
			var client = req.headers['x-dogo-client']
			if (false && semver.lt(client, '0.96.0')) {
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
	app.post('/api/sessions', filter.oldClients, function postSessions(req, res) {
		var params = getParams(req, 'facebookAccessToken', 'facebookRequestId')
		sessionService.createSession(params.facebookAccessToken, params.facebookRequestId, curry(respond, req, res))
	})
	app.get('/api/session', filter.oldClients, function getSession(req, res) {
		var params = getParams(req, 'authToken')
		sessionService.getSession(params.authToken, curry(respond, req, res))
	})
	app.get('/api/conversations', filter.oldClientsAndSession, function getConversations(req, res) {
		var params = getParams(req)
		messageService.getConversations(req.session.accountId, wrapRespond(req, res, 'conversations'))
	})
	app.get('/api/contacts', filter.oldClientsAndSession, function getContacts(req, res) {
		var params = getParams(req)
		accountService.getContacts(req.session.accountId, wrapRespond(req, res, 'contacts'))
	})
	app.post('/api/messages', filter.oldClientsAndSession, function postMessage(req, res) {
		var params = getParams(req, 'toFacebookId', 'toAccountId', 'clientUid', 'body', 'base64Picture', 'pictureWidth', 'pictureHeight', 'picWidth', 'picHeight', 'devPush')
		var prodPush = (req.headers['x-dogo-mode'] == 'appstore')
		if (!params.pictureWidth) { params.pictureWidth = 920 }
		if (!params.pictureHeight) { params.pictureHeight = 640 }
		messageService.sendMessage(req.session.accountId, params.clientUid,
			params.toFacebookId, params.toAccountId, params.body,
			params.base64Picture, params.pictureWidth, params.pictureHeight,
			prodPush, curry(respond, req, res))
	})
	app.get('/api/messages', filter.oldClientsAndSession, function getConversationMessages(req, res) {
		var params = getParams(req, 'withAccountId', 'withFacebookId')
		messageService.getMessages(req.session.accountId,
			params.withAccountId, params.withFacebookId,
			wrapRespond(req, res, 'messages'))
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
		console.log('download version', req.url)
		fs.readFile(__dirname+'/../../build/dogo-ios-build.tar', bind(this, function(err, tar) {
			if (err) { return respond(req, res, err) }
			console.log("send download response", tar.length)
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
	app.use(function onError(err, req, res, next){
		console.log("Route error".red, err)
		respond(req, res, err)
	})
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
	
	app.get('/app.html', sendFile('src/client/dogo.html'))
	app.get('/jquery.js', sendFile('src/client/lib/jquery-1.7.2.js'))
	
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
	app.get('/img/*', function(req, res) {
		fs.readFile('src/client'+req.url, curry(respond, req, res))
	})
	app.get('/img_src/*', function(req, res) {
		fs.readFile('src/client'+req.url, curry(respond, req, res))
	})
	
	app.get('/stylus/*', function(req, res) {
		combine.compileStylusPath(req.path, {}, curry(respondCss, req, res))
	})
	
	app.get('/require/*', function(req, res) {
		combine.handleRequireRequest(req, res)
	})
	
	function sendPage(name) {
		return function(req, res) {
			buildPage(name, curry(respondHtml, req, res))
		}
	}
	
	function sendFile(path) {
		return function (req, res) {
			fs.readFile(path, curry(respond, req, res))
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
	
	console.log(getTime(), req.method, req.url, req.meta, logParams)
	return params
}

function getTime() {
	var d = new Date()
	return d.getFullYear()+'/'+d.getMonth()+'/'+d.getDate()+'-'+d.getHours()+':'+d.getMinutes()+':'+d.getSeconds()
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
			console.warn("Unauthorized".red, req.url.pink)
		} else {
			var stackError = new Error()
			code = 500
			content = err.stack || err.message || (err.toString && err.toString()) || err
			if (respond.log) {
				var logBody = JSON.stringify(req.body)
				if (logBody.length > 400) { logBody = logBody.substr(0, 400) + ' (......)' }
				console.warn('error', content, req.url, logBody, stackError.stack)
			}
		}
		contentType = 'text/plain'
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
		console.log("Error sending message", e.stack || e)
		try { res.end("Error sending message") }
		catch(e) { console.log("COULD NOT RESPOND") }
	}
	console.log(getTime(), 'Responded', req.method, req.url, req.meta)
}
