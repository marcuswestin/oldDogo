var express = require('express')
var fs = require('fs')
var path = require('path')
var http = require('http')
var semver = require('semver')
var uuid = require('uuid')
var messageService = require('server/MessageService')
var setPushAuth = require('server/fn/setPushAuth')
var getConversations = require('server/fn/getConversations')
var addAddresses = require('server/fn/addAddresses')
var sendEmail = require('server/fn/sendEmail')
var createSession = require('server/fn/createSession')
var requestVerification = require('server/fn/requestVerification')
var register = require('server/fn/register')
var authenticateRequest = require('server/fn/authenticateRequest')

var log = makeLog('Router')

module.exports = function makeRouter(opts) {
	
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
			if (req.url.match(/^\/api\//) && req.url != '/api/ping' && !req.url.match(/^\/api\/test/)) {
				respond(req, res, "My server is down for maintainance. Please try again soon!")
			} else {
				next()
			}
		})
	}
	
	app.use(express.bodyParser({ limit:'16mb' }))
	// addApiLatency(app, 2000)
	
	var server = http.createServer(app)
	
	if (opts.dev) {
		setupDev(app)
	}
	
	if (!opts.proxyProd) {
		setupRoutes(app, opts)
	}
	
	app.all('*', function onError(req, res, next) { respond(req, res, 404) })
	
	return {
		listen:function(port) {
			server.listen(port)
			log.info('started', process.pid, ("listening on :"+port).green)
			process.on('SIGINT', function() {
				log.info('dogo-web closing down')
				server.close()
				process.exit()
			})
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

var filters = (function makeFilters() {
	return {
		oldClients:filterOldClients,
		session:filterSession,
		delay:delayRequest,
		oldClientsAndSession: [filterOldClients, filterSession]
	}
	
	function filterOldClients(req, res, next) {
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
	}
	
	function filterSession(req, res, next) {
		req.authorization = req.headers.authorization || req.param('authorization')
		authenticateRequest(req, function(err, personId) {
			if (err) {
				log('bad auth', req.authorization)
				return next(err)
			}
			if (!personId) {
				log('unauthorized client', req.authorization)
				return next('Unauthorized')
			}
			req.session = { personId:personId }
			next()
		})
	}
	
	function delayRequest(amount) {
		return function(req, res, next) {
			setTimeout(function() { next() }, amount)
		}
	}
}())

function setupRoutes(app, opts) {
	app.all('/api/address/verification', function(req, res) {
		var params = getMultipartParams(req, 'address', 'name', 'color', 'password')
		var pictureFile = req.files && req.files.picture
		requestVerification(params.address, params.name, params.color, params.password, pictureFile, curry(respond, req, res))
	})
	app.post('/api/register/withAddressVerification', function(req, res) {
		var params = getJsonParams(req, 'verificationId', 'verificationToken', 'password')
		register.withAddressVerification(params.verificationId, params.verificationToken, params.password, wrapRespond(req, res, 'person'))
	})
	app.post('/api/session', filters.oldClients, function postSession(req, res) {
		var params = getJsonParams(req, 'address', 'password')
		createSession(params.address, params.password, curry(respond, req, res))
	})
	
	
	
	app.post('/api/waitlist', function(req, res) {
		var params = getJsonParams(req, 'emailAddress')
		accountService.lookupOrCreateByEmail(params.emailAddress, function(err, person) {
			if (err) { return respond(req, res, err) }
			db.insert('INSERT INTO waitlistEvent SET personId=?, userAgent=?', [person.personId, req.headers['user-agent']], function(err) {
				if (err) { log.warn("COULD NOT INSERT WAITLIST EVENT", params.emailAddress, person.personId, req.headers)}
			})
			if (person.waitlistedTime) {
				respond(req, res, null, { person:person, waitlistedSince:time.ago(person.waitlistedTime * time.seconds) })
				log.alert('Repeat waitlister', params.emailAddress)
			} else {
				person.waitlistedTime = db.time()
				db.updateOne('UPDATE person SET waitlistedTime=? WHERE personId=?', [person.waitlistedTime, person.personId], function(err) {
					if (err) {
						log.alert('Error creating new waitlister', params.emailAddress)
						return respond(req, res, err)
					}
					respond(req, res, null, { person:person, waitlistedSince:null })
					log.alert('New waitlister', params.emailAddress)
				})
			}
		})
	})
	
	app.all('/api/test/gzip', function(req, res) {
		var data = {"data":{"Foo":"Bar"}, "data2":[1,2,3,5]}
		respond(req, res, null, data, 'application/json')
	})
	app.get('/api/test/upload', function(req, res) {
		respond(req, res, null, '<form action="/api/test/upload" enctype="multipart/form-data" method="post">'+
	    '<input type="text" name="title"><br>'+
	    '<input type="file" name="upload" multiple="multiple"><br>'+
	    '<input type="submit" value="Upload">'+
	    '</form>', 'text/html')
	})
	app.post('/api/test/upload', function(req, res) {
		log.debug("TODO Update files", req.files)
	})
	app.all('/api/ping', function(req, res) {
		res.end('"Dogo!"')
	})
	// app.post('/api/register', filters.oldClients, function postRegister(req, res) {
	// 	var params = getJsonParams(req, 'name', 'color', 'email', 'password', 'fbSession')
	// 	accountService.register(name, color, email, password, fbSession, curry(respond, req, res))
	// })
	app.post('/api/login', filters.oldClients, function postSession(req, res) {
		var params = getJsonParams(req, 'address', 'password')
		if (params.facebookRequestId) { return respond(req, res, "Sessions for facebook requests is not ready yet. Sorry!") }
		createSession(req, params.address, params.password, curry(respond, req, res))
	})
	app.get('/api/conversations', filters.oldClientsAndSession, function getConversations(req, res) {
		getUrlParams(req) // for logging
		getConversations(req, wrapRespond(req, res, 'conversations'))
	})
	app.post('/api/addresses', filters.oldClientsAndSession, function postAddresses(req, res) {
		var params = getJsonParams(req, 'newAddresses')
		addAddresses(req, params.newAddresses, curry(respond, req, res))
	})
	app.post('/api/message', filters.oldClientsAndSession, function postMessage(req, res) {
		var params = getMultipartParams(req, 'toParticipationId', 'clientUid', 'type', 'payload')
		var prodPush = (req.headers['x-dogo-mode'] == 'appstore')
		var payloadFile = req.files && req.files.payload
		messageService.sendMessage(req.session.personId,
			params.toParticipationId, params.clientUid,
			params.type, params.payload, payloadFile, prodPush,
			function(err, content) {
				if (payloadFile) {
					fs.unlink(payloadFile.path, function(err) {
						if (err) { log.warn('Unable to unlink data file', payloadFile, err) }
					})
				}
				respond(req, res, err, content)
			}
		)
	})
	app.get('/api/messages', filters.oldClientsAndSession, function getConversationMessages(req, res) {
		var params = getUrlParams(req, 'participationId')
		messageService.getMessages(req.session.personId, parseInt(params.participationId), function(err, messages) {
			respond(req, res, err, !err && { messages:messages })
		})
	})
	app.post('/api/pushAuth', filters.oldClientsAndSession, function postPushAuth(req, res) {
		var params = getJsonParams(req, 'pushToken', 'pushType')
		setPushAuth(req.session.personId, params.pushToken, params.pushType,
			curry(respond, req, res))
	})
	app.get('/api/version/info', filters.oldClientsAndSession, function getVersionInfo(req, res) {
		var url = null // 'http://marcus.local:9000/api/version/download/latest.tar'
		respond(req, res, null, { url:url })
	})
	app.get('/api/version/download/*', filters.session, function downloadVersion(req, res) {
		res.writeHead(204)
		res.end()
		return
		log('download version', req.url)
		fs.readFile(__dirname+'/../../../build/dogo-ios-build.tar', function(err, tar) {
			if (err) { return respond(req, res, err) }
			log("send download response", tar.length)
			respond(req, res, null, tar, 'application/x-tar')
		})
	})
	app.get('/api/facebookCanvas/conversation', function getFacebookConversation(req, res) {
		var params = getUrlParams(req, 'facebookRequestId')
		messageService.loadFacebookRequestId(params.facebookRequestId, curry(respond, req, res))
	})
	app.post('/api/facebookRequests', filters.session, function saveFacebookRequest(req, res) {
		var params = getJsonParams(req, 'facebookRequestId', 'toPersonId', 'conversationId')
		messageService.saveFacebookRequest(req.session.personId, params.facebookRequestId, params.toPersonId, params.conversationId, curry(respond, req, res))
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
	app.get('/graphics/*', sendStatic('src'))
	app.get('/lib/*', sendStatic('src/js'))
	app.get('/client/*', sendStatic('src/js'))
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
	
	app.post('/api/messageDev', filters.oldClientsAndSession, function postMessageDebug(req, res) {
		var params = getJsonParams(req, 'toParticipationId', 'clientUid', 'type', 'payload')
		messageService.sendMessage(req.session.personId, params.toParticipationId, params.clientUid, params.type, params.payload, null, false,
			curry(respond, req, res)
		)
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

function getUrlParams(req) {
	return logParams(req, _collectParams(arguments, function(argName) {
		var param = req.param(argName)
		return (param == 'null' ? null : param)
	}))
}

function getMultipartParams(req) {
	var jsonParams = JSON.parse(req.body['jsonParams'])
	return logParams(req, _collectParams(arguments, function(argName) {
		return jsonParams[argName]
	}))
}

function getJsonParams(req) {
	return logParams(req, _collectParams(arguments, function(argName) {
		return req.param(argName)
	}))
}

function _collectParams(args, collectFn) {
	var params = {}
	each(slice(args, 1), function(argName) {
		params[argName] = collectFn(argName)
		if (typeof params[argName] == 'string') {
			params[argName] = trim(params[argName])
		}
	})
	return params
}

function logParams(req, params) {
	req.params = params
	
	req.meta = {
		personId: req.session && req.session.personId,
		client: req.headers['x-dogo-client']
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
		if (err === true) {
			err = "I'm Sorry, I found a problem. Marcus has been notified, and he should be taking care of the problem very soon."
		}
		
		if (err === 'Unauthorized') {
			code = 401
			content = 'Authorization Required'
			headers['WWW-Authenticate'] = 'Basic'
			log.warn("Unauthorized".red, req.url.pink)
		} else if (err == 404) {
			code = 404
			content = 'Could not ' + req.method + ' ' + req.url
			contentType = 'text/plain'
			log.warn('404', req.method, req.url)
		} else {
			var stackError = new Error()
			code = 500
			content = err.stack || err.message || (err.args && err.args.join(' | ')) || (err.toString && err.toString()) || err
			if (respond.log) {
				var logBody = JSON.stringify(req.params)
				if (logBody && logBody.length > 400) { logBody = logBody.substr(0, 400) + ' (......)' }
				if (err.alert) { log.alert.apply(this, err.args) }
				log.warn(content, req.url, logBody, stackError.stack)
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
	
	if (contentType.match(/^(text|application)/)) {
		headers['Content-Type'] = contentType+'; charset=utf-8'
		headers['Content-Length'] = Buffer.isBuffer(content) ? content.length : Buffer.byteLength(content, 'utf8')
		if (contentType == 'application/json') {
			headers['Cache-Control'] = 'no-cache'
		}
	} else {
		headers['Content-Type'] = contentType
		headers['Content-Length'] = content.length
	}
	
	res.writeHead(code, headers)
	res.end(content)
	} catch(e) {
		log.warn("Error sending message", e.stack || e)
		try { res.end("Error sending message") }
		catch(e) { log.error("COULD NOT RESPOND") }
	}
	// TODO Start logging timing somewhere
	// log(req.method, req.url, req.meta, req.timer && req.timer.report())
}
