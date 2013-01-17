var express = require('express')
var SessionService = require('./SessionService')
var fs = require('fs')
var path = require('path')
var curry = require('std/curry')
var slice = require('std/slice')
var http = require('http')
var semver = require('semver')
var log = require('./util/log').makeLog('Router')
var time = require('std/time')
var sms = require('./sms')
var filter = require('std/filter')
var map = require('std/map')

require('color')

module.exports = function makeRouter(database, accountService, messageService, sessionService, pictureService, opts) {
	
	var app = express()
	
	respond.log = (opts.log || opts.dev)

	// opts.proxyProd = true
	if (opts.proxyProd) { setupProdProxy(app) }
	
	app.use(function(req, res, next) {
		req.timer = makeTimer(req.url)
		next()
	})

	opts.apiMaintainance = true
	if (opts.apiMaintainance) {
		app.use(function(req, res, next) {
			if (req.url.match(/^\/api\//) && req.url != '/api/ping') {
				respond(req, res, "My server is down for maintainance. Please try again soon!")
			} else {
				next()
			}
		})
	}
	
	app.use(express.bodyParser({ limit:'8mb' }))
	// addApiLatency(app, 2000)
	
	var server = http.createServer(app)
	
	if (opts.dev) { setupDev(app) }
	
	if (!opts.proxyProd) {
		setupRoutes(app, database, accountService, messageService, sessionService, pictureService, opts)
	}
	
	app.all('*', function onError(req, res, next) { respond(req, res, 404) })
	
	return {
		listen:function(port) {
			server.listen(port)
			log("dogo-web listening on :"+port)
		}
	}
}

function addApiLatency(app, amount) {
	app.use(function(req, res, next) {
		if (req.url.match(/^\/api/)) {
			setTimeout(function(){ next() }, amount)
		} else {
			next()
		}
	})
}

function setupProdProxy(app) {
	var https = require('https')
	
	app.all('/api/*', function(req, res) {
		delete req.headers['host']
		log("Proxy to prod", req.method, req.url)
		var options = {
			host:   'dogoapp.com',
			port:   443,
			path:   req.url,
			method: req.method,
			headers: req.headers
		}

		var creq = https.request(options, function(cres) {
			log(req.url, 'Proxy got', cres.statusCode)
			res.writeHead(cres.statusCode, cres.headers);
			cres.setEncoding('utf8');
			cres.on('data', function(chunk) { res.write(chunk) })
			cres.on('end', function(){ res.end() })
		})
		
		creq.on('error', function(e) {
			log.error(e.message)
			res.writeHead(500)
			res.end()
		})
		
		req.on('data', function(chunk) { creq.write(chunk) })
		req.on('end', function() { creq.end() })
	})
}

function setupRoutes(app, database, accountService, messageService, sessionService, pictureService, opts) {
	var filter = {
		oldClients: function filterOldClient(req, res, next) {
			var client = req.headers['x-dogo-client']
			if (semver.lt(client, '0.98.0-_')) {
				log('refuse old client', client)
				res.writeHead(400, {
					'x-dogo-process': 'alert("You have an outdated client. Please upgrade to the most recent version.")'
				})
				res.end()
				return
			}
			next()
		},
		session: function filterSession(req, res, next) {
			req.authorization = req.headers.authorization || req.param('authorization')
			sessionService.authenticateRequest(req, function(err, dogoId) {
				if (err) {
					log('bad auth', req.authorization)
					return next(err)
				}
				if (!dogoId) {
					log('unauthorized client', req.authorization)
					return next('Unauthorized')
				}
				req.session = { dogoId:dogoId }
				next()
			})
		},
		delay: function delayRequest(amount) {
			return function(req, res, next) {
				setTimeout(function() { next() }, amount)
			}
		}
	}
	filter.oldClientsAndSession = [filter.oldClients, filter.session]
	
	app.post('/api/waitlist', function(req, res) {
		var params = getParams(req, 'emailAddress')
		accountService.lookupOrCreateByEmail(params.emailAddress, bind(this, function(err, account) {
			if (err) { return respond(req, res, err) }
			database.insert(this, 'INSERT INTO waitlist_event SET account_id=?, user_agent=?', [account.id, req.headers['user-agent']], function(err) {
				if (err) { log.warn("COULD NOT INSERT WAITLIST EVENT", params.emailAddress, account.id, req.headers)}
			})
			if (account.waitlistedTime) {
				respond(req, res, null, { account:account, waitlistedSince:time.ago(account.waitlistedTime * time.seconds) })
				sms.notify('Repeat waitlister: ' + params.emailAddress)
			} else {
				account.waitlistedTime = database.time()
				database.updateOne(this, 'UPDATE account SET waitlisted_time=? WHERE id=?', [account.waitlistedTime, account.id], function(err) {
					if (err) {
						sms.notify("Error cretating new waitlister! " + params.emailAddress)
						return respond(req, res, err)
					}
					respond(req, res, null, { account:account, waitlistedSince:null })
					sms.notify('New waitlister! ' + params.emailAddress)
				})
			}
		}))
	})
	
	app.get('/api/ping', function(req, res) {
		res.end('"Dogo!"')
	})
	app.post('/api/session', filter.oldClients, function postSession(req, res) {
		var params = getParams(req, 'facebookAccessToken', 'facebookRequestId')
		if (params.facebookRequestId) { return respond(req, res, "Sessions for facebook requests is not ready yet. Sorry!") }
		sessionService.createSession(req, params.facebookAccessToken, curry(respond, req, res))
	})
	// app.get('/api/session', filter.oldClients, function getSession(req, res) {
	// 	var params = getParams(req, 'authToken')
	// 	sessionService.getSession(params.authToken, curry(respond, req, res))
	// })
	app.get('/api/conversations', filter.oldClientsAndSession, function getConversations(req, res) {
		var params = getParams(req)
		messageService.getConversations(req, function(err, conversations) {
			respond(req, res, err, !err && { conversations:conversations })
		})
	})
	// app.get('/api/contacts', filter.oldClientsAndSession, function getContacts(req, res) {
	// 	var params = getParams(req)
	// 	accountService.getContacts(req.session.dogoId, wrapRespond(req, res, 'contacts'))
	// })
	app.post('/api/message', filter.oldClientsAndSession, function postMessage(req, res) {
		var params = getParams(req, 'toConversationId', 'clientUid', 'type', 'payload')
		var prodPush = (req.headers['x-dogo-mode'] == 'appstore')
		messageService.sendMessage(req.session.dogoId,
			params.toConversationId, params.clientUid,
			params.type, params.payload,
			prodPush, curry(respond, req, res))
	})
	app.get('/api/messages', filter.oldClientsAndSession, function getConversationMessages(req, res) {
		var params = getParams(req, 'conversationId')
		messageService.getMessages(req.session.dogoId, params.conversationId, function(err, messages) {
			respond(req, res, err, !err && { messages:messages })
		})
	})
	app.post('/api/push_auth', filter.oldClientsAndSession, function postPushAuth(req, res) {
		var params = getParams(req, 'pushToken', 'pushSystem')
		accountService.setPushAuth(req.session.dogoId, params.pushToken, params.pushSystem,
			curry(respond, req, res))
	})
	app.get('/api/account_info', filter.oldClientsAndSession, function getAccountInfo(req, res) {
		var params = getParams(req, 'dogoId', 'facebookId')
		accountService.getAccount(params.dogoId, params.facebookId, wrapRespond(req, res, 'account'))
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
		fs.readFile(__dirname+'/../../../build/dogo-ios-build.tar', bind(this, function(err, tar) {
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
		var params = getParams(req, 'facebookRequestId', 'toDogoId', 'conversationId')
		messageService.saveFacebookRequest(req.session.dogoId, params.facebookRequestId, params.toDogoId, params.conversationId, curry(respond, req, res))
	})
}

function setupDev(app) {
	var combine = require('combine')
	var buildPage = require('website/build-page')
	
	app.get('/', sendPage('homepage'))
	app.all(/^\/facebook_canvas*/, sendPage('facebook_canvas'))
	app.get('/terms', sendPage('terms'))
	app.get('/privacy', sendPage('privacy'))
	app.get('/identity', sendPage('identity'))
	app.get('/test', sendPage('test'))
	
	app.get('/app', sendFile('src/js/client/dogo.html', 'text/html'))
	app.get('/favicon.ico', sendFile('src/graphics/website/favicon.png', 'image/png'))
		
	app.get('/fonts/*', sendStatic('src'))
	app.get('/lib/*', sendStatic('src'))
	app.get('/graphics/*', sendStatic('src'))
	app.get('/client/*', sendStatic('src'))
	app.get('/experiments*', sendExperiment)
	
	app.get('/stylus/*', function(req, res) {
		combine.compileStylusPath(req.path, {}, curry(respondCss, req, res))
	})
	
	app.get('/require/*', function(req, res) {
		combine.handleRequireRequest(req, res)
	})
	
	each(['BTImage'], function(btModule) {
		require('blowtorch-node-sdk/'+btModule).setup(app)
	})
	
	function sendExperiment(req, res) {
		var experiment = req.url.replace(/\/experiments\/?/, '')
		var html = experiment
			? fs.readFileSync('src/experiments/experiment.html').toString().replace(/EXPERIMENT_NAME/g, experiment)
			: map(filter(fs.readdirSync('src/experiments'), function(dir) { return !!dir.match(/\.js$/) }), function(dir) {
				var name = dir.split('.')[0]
				return '<a href="/experiments/'+name+'">'+name+'</a>'
			}).join('<br />')
		res.writeHead(200, { 'Content-Type':'text/html' })
		res.end(html)
	}
	
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
	
	req.meta = {
		dogoId: req.session && req.session.dogoId,
		client: req.headers['x-dogo-client'],
		agent: req.headers['user-agent']
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
			log.warn('404', req.method, req.url)
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
		} else if (req.url.match(/\.ttf$/)) {
			contentType = 'font/opentype'
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
	log(req.method, req.url, req.meta, req.timer && req.timer.report())
}
