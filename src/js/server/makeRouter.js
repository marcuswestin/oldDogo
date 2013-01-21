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
var database = require('server/Database')
var accountService = require('server/AccountService')
var messageService = require('server/MessageService')
var sessionService = require('server/SessionService')
var pictureService = require('server/PictureService')

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
	
	if (opts.dev) { setupDev(app) }
	
	if (!opts.proxyProd) {
		setupRoutes(app, database, accountService, messageService, sessionService, pictureService, opts)
	}
	
	app.all('*', function onError(req, res, next) { respond(req, res, 404) })
	
	return {
		listen:function(port) {
			server.listen(port)
			log(("dogo-web listening on :"+port).green)
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

function setupRoutes(app, opts) {
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
			sessionService.authenticateRequest(req, function(err, personId) {
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
		accountService.lookupOrCreateByEmail(params.emailAddress, function(err, person) {
			if (err) { return respond(req, res, err) }
			database.insert('INSERT INTO waitlistEvent SET personId=?, userAgent=?', [person.id, req.headers['user-agent']], function(err) {
				if (err) { log.warn("COULD NOT INSERT WAITLIST EVENT", params.emailAddress, person.id, req.headers)}
			})
			if (person.waitlistedTime) {
				respond(req, res, null, { person:person, waitlistedSince:time.ago(person.waitlistedTime * time.seconds) })
				sms.notify('Repeat waitlister: ' + params.emailAddress)
			} else {
				person.waitlistedTime = database.time()
				database.updateOne('UPDATE person SET waitlistedTime=? WHERE id=?', [person.waitlistedTime, person.id], function(err) {
					if (err) {
						sms.notify("Error cretating new waitlister! " + params.emailAddress)
						return respond(req, res, err)
					}
					respond(req, res, null, { person:person, waitlistedSince:null })
					sms.notify('New waitlister! ' + params.emailAddress)
				})
			}
		})
	})
	
	app.all('/api/test/gzip', function(req, res) {
		res.writeHead(200, { 'Content-Type':'application/json' })
		res.end(JSON.stringify({"data":[{"id":"2004","name":"Ryan Browne","birthday":"06/17"},{"id":"4618","name":"Michael Whealy"},{"id":"111659","name":"Nicole Ross","birthday":"06/21/1983"},{"id":"116294","name":"Ashley Baker","birthday":"04/04/1986"},{"id":"116915","name":"Miranda Eng","birthday":"03/26/1986"},{"id":"125061","name":"Alison Joseph","birthday":"08/10/1978"},{"id":"200336","name":"Priscilla Pham"},{"id":"201173","name":"Mark Linsey","birthday":"01/12/1985"},{"id":"201207","name":"Tristan Harris"},{"id":"201511","name":"Can Sar"},{"id":"201600","name":"Mikey Lee"},{"id":"203052","name":"Steven Lehrburger"},{"id":"203553","name":"Mike LeBeau"},{"id":"205933","name":"Pilar Abascal","birthday":"11/30/1982"},{"id":"206831","name":"Matt Spitz"},{"id":"207784","name":"Mike Krieger"},{"id":"208262","name":"Abel Allison"},{"id":"209538","name":"Laura Holmes","birthday":"07/23/1986"},{"id":"210718","name":"Elaine Wherry","birthday":"02/25/1978"},{"id":"212701","name":"Vikram Oberoi"},{"id":"212766","name":"Jim Rodgers"},{"id":"216265","name":"Erik 'ABBA' Nygren"},{"id":"220145","name":"Sandy Jen"},{"id":"222699","name":"David Li"},{"id":"224713","name":"Jian Shen"},{"id":"300724","name":"Alexis Ringwald"},{"id":"303832","name":"Chris Szeto","birthday":"01/24"},{"id":"305165","name":"Vera Tzoneva","birthday":"12/06"},{"id":"313073","name":"Maureen Gartner","birthday":"09/25"},{"id":"400768","name":"Kwame Thomison","birthday":"04/20"},{"id":"405250","name":"Phillip Nelson","birthday":"05/22"},{"id":"608305","name":"Andrew Watterson","birthday":"04/30/1986"},{"id":"704016","name":"Jugal Shah"},{"id":"709246","name":"Karina Pikhart","birthday":"11/12/1987"},{"id":"810329","name":"Alex Case","birthday":"06/05/1986"},{"id":"825277","name":"Andrew Johnson","birthday":"01/27/1987"},{"id":"1009387","name":"Randall Leeds"},{"id":"1103285","name":"Jana Holt","birthday":"09/14/1985"},{"id":"1204208","name":"Kim-Mai Cutler"},{"id":"1242655","name":"Melissa Ong","birthday":"09/05/1978"},{"id":"1310132","name":"Katie Grien"},{"id":"2103260","name":"Stephanie Cord Melton"},{"id":"2406380","name":"Julia Wennstrom","birthday":"11/26/1985"},{"id":"2416106","name":"Kate Carter"},{"id":"2501175","name":"Stephen Johnson"},{"id":"2900217","name":"Jesse Friedman","birthday":"07/26/1983"},{"id":"2900569","name":"Jesse Farmer"},{"id":"2900570","name":"Harold Liss","birthday":"10/22/1984"},{"id":"2900681","name":"Sarah-Doe Osborne","birthday":"02/25"},{"id":"2901248","name":"Ido Rosen"},{"id":"2901287","name":"Megan Wachspress","birthday":"01/14/1984"},{"id":"2901467","name":"Adam Crager","birthday":"04/21/1985"},{"id":"2901638","name":"Geoff Domoracki","birthday":"11/22"},{"id":"2901904","name":"Deniz Kusefoglu"},{"id":"2902567","name":"Madeleine McLeester","birthday":"07/30"},{"id":"2902716","name":"Daniel Kimerling","birthday":"03/05"},{"id":"2902827","name":"Ashley Meyer","birthday":"01/23"},{"id":"2902833","name":"Peter Thorson"},{"id":"2902951","name":"Julia Zhu"},{"id":"2903008","name":"Ivan Beschastnikh"},{"id":"2903331","name":"Robin Zhi Xing","birthday":"07/21/1986"},{"id":"2903458","name":"Rochelle Terman"},{"id":"2903755","name":"K. A. Westphal"},{"id":"2903818","name":"Gustavo Sapoznik"},{"id":"2903867","name":"Ricky Greacen"},{"id":"2903900","name":"Kim Eggert","birthday":"03/22/1986"},{"id":"2904123","name":"Peter Behr"},{"id":"2904225","name":"Le Wang"},{"id":"2904255","name":"Larken Root","birthday":"02/15/1986"},{"id":"2904389","name":"Massimo Young","birthday":"01/28"},{"id":"2904676","name":"Igor Frankenstein"},{"id":"2904704","name":"Jonathan E Cowperthwait"},{"id":"2904743","name":"Kirsten Johnson","birthday":"05/08/1983"},{"id":"2905055","name":"Nishan Bingham","birthday":"04/26/1986"},{"id":"2905626","name":"Borja Sotomayor"},{"id":"2905737","name":"Yana Morgulis"},{"id":"2906005","name":"Sadie Radford","birthday":"10/10/1985"},{"id":"2906652","name":"Christopher Casebeer"},{"id":"2906755","name":"Jordan Phillips"},{"id":"2907206","name":"Lisa Wang"},{"id":"2907463","name":"David Jarvis"},{"id":"2907602","name":"Aaron Greenberg","birthday":"07/20/1987"},{"id":"2908411","name":"Carmel Levy"},{"id":"2908583","name":"Willy Chyr"},{"id":"2909029","name":"Elisabet Pujadas","birthday":"11/16/1987"},{"id":"2910768","name":"Yukio Koriyama","birthday":"12/06/1974"},{"id":"2910804","name":"Angeline Gragasin"},{"id":"2911482","name":"Tyler Rasch","birthday":"05/06/1988"},{"id":"2911644","name":"Karl Norby"},{"id":"2911989","name":"Lauren Ellsworth"},{"id":"2912508","name":"Jasmine Heiss","birthday":"07/05/1988"},{"id":"2912793","name":"Bryan Moles"},{"id":"2912986","name":"Mathieu Gat"},{"id":"3415139","name":"Marcus Phillips","birthday":"12/18"},{"id":"3700969","name":"Rawry Everso-fair","birthday":"04/11/1967"},{"id":"4711399","name":"Ben Clark","birthday":"01/19"},{"id":"5315124","name":"Josh Wohlgemuth"},{"id":"6028866","name":"Kenny Ma"},{"id":"6202449","name":"Allen Kerr"},{"id":"6703398","name":"Andreas Binnewies"},{"id":"6851389","name":"Rachel Auer"},{"id":"7200932","name":"Annie Lausier","birthday":"11/19/1982"},{"id":"7201623","name":"Jacob Lyles","birthday":"01/19/1983"},{"id":"8702606","name":"Danielle Baker","birthday":"08/21/1983"},{"id":"8702717","name":"Sarah Micley"},{"id":"10010942","name":"Ryan Knapp","birthday":"10/31/1982"},{"id":"12412163","name":"Adam Gray"},{"id":"13001399","name":"Andrina Wekontash Smith","birthday":"08/25/1985"},{"id":"13302682","name":"Martin Hunt","birthday":"07/30"},{"id":"13303162","name":"Adrienne DuComb"},{"id":"13304226","name":"Desiree Golen"},{"id":"13900400","name":"Rebecca Coelius"},{"id":"14500529","name":"Melia Flagg","birthday":"03/06/1986"},{"id":"16905735","name":"Shaun Lindsay"},{"id":"17814006","name":"John Beatty"},{"id":"18904593","name":"Donna Lipkis Goldstone","birthday":"01/02/1983"},{"id":"19100550","name":"Zach Hyman","birthday":"01/09/1986"},{"id":"21501245","name":"Wil Weiss"},{"id":"22701890","name":"Samanthe Lobosco","birthday":"10/02/1985"},{"id":"24205459","name":"Jessica Singer","birthday":"04/24/1987"},{"id":"24411870","name":"Leo Gala"},{"id":"28600780","name":"Marissa Maier","birthday":"07/12/1986"},{"id":"28703757","name":"Tom Fairfield"},{"id":"30703338","name":"Han Li"},{"id":"33502025","name":"Mark Erdmann"},{"id":"34700232","name":"Paul Handly"},{"id":"36909452","name":"Patrick Monahan","birthday":"10/14/1982"},{"id":"43102015","name":"Stephen T. Lobosco","birthday":"09/15"},{"id":"45402657","name":"Angela Bunt","birthday":"04/22/1987"},{"id":"47401313","name":"Nicki Lowell","birthday":"09/25/1986"},{"id":"48605671","name":"Tyler Holcomb","birthday":"02/24/1987"},{"id":"53901145","name":"Gwendolyn Diaz","birthday":"04/16"},{"id":"57300809","name":"Katherine Brannon Fishman","birthday":"05/06"},{"id":"60717212","name":"Katinka Holst","birthday":"07/12/1986"},{"id":"70900271","name":"Erica Rae","birthday":"05/09"},{"id":"82100201","name":"Thomas Impiglia","birthday":"08/19/1985"},{"id":"82300178","name":"Laura Hadden"},{"id":"187905138","name":"Matt Beckstead","birthday":"03/04/1984"},{"id":"223406159","name":"Mohammad Ali Shabani"},{"id":"286100641","name":"Paul Sowden"},{"id":"500011067","name":"Justin Rosenstein","birthday":"05/13/1983"},{"id":"500018190","name":"Todd Masonis","birthday":"11/25/1979"},{"id":"500044887","name":"Kelvin Zheng"},{"id":"502274327","name":"Mark Doliner"},{"id":"502649642","name":"Mikael Bernstein","birthday":"01/14"},{"id":"505718534","name":"Simon Yeo"},{"id":"506407422","name":"Dustin Dettmer","birthday":"02/19"},{"id":"510008056","name":"Nikolaos Bonatsos"},{"id":"512834407","name":"Martin Sööder","birthday":"08/17"},{"id":"516678567","name":"Prasanna Sankaranarayanan"},{"id":"516820639","name":"Hassan Abdirahman Ali","birthday":"02/24"},{"id":"519276618","name":"Dan Roe"},{"id":"522000882","name":"Marika Hjälsten","birthday":"06/19/1984"},{"id":"522126212","name":"Julia Holmgren Ekermann","birthday":"12/27/1985"},{"id":"522775340","name":"Bogumił Kazimierz Giertler","birthday":"12/16"},{"id":"538466517","name":"Greg Fair","birthday":"02/20/1975"},{"id":"539787956","name":"Anna Ostrowski","birthday":"09/13"},{"id":"540146889","name":"Anton Cantillana","birthday":"07/21/1985"},{"id":"544186829","name":"Rickard Ström"},{"id":"544456000","name":"Linda Wennler","birthday":"08/04/1985"},{"id":"548170118","name":"Crystine Serrone"},{"id":"551982358","name":"Renaud Amar"},{"id":"553700223","name":"Aadel Kersh","birthday":"12/05/1985"},{"id":"554292516","name":"Angelica Carleson"},{"id":"554485398","name":"Kevin Irish","birthday":"10/22/1988"},{"id":"557741490","name":"Vijay Raghunathan"},{"id":"557855802","name":"Felix Forsgårdh"},{"id":"560627039","name":"Chris Eberle","birthday":"11/12"},{"id":"561151735","name":"Molly Butler","birthday":"04/20"},{"id":"561726057","name":"Oscar Töringe","birthday":"06/15/1983"},{"id":"561851125","name":"Anders Ågust Nordkvist"},{"id":"562356388","name":"Vera Siesjö","birthday":"12/14"},{"id":"564680537","name":"Carl Carlbom","birthday":"02/15"},{"id":"565380124","name":"Thomas Carlsson"},{"id":"574375264","name":"Adam Baker","birthday":"09/12/1981"},{"id":"576360444","name":"Maria Jersblad","birthday":"02/04/1985"},{"id":"577480985","name":"Isac Hellwig","birthday":"12/19"},{"id":"580265434","name":"Jonas Borneroth","birthday":"12/07/1985"},{"id":"583570307","name":"Jacob Töringe","birthday":"06/03/1981"},{"id":"584566860","name":"Katarina Westin"},{"id":"586641466","name":"Ahmed Abdirahman"},{"id":"590621981","name":"Bryan Lamkin","birthday":"05/31"},{"id":"591224904","name":"Joey Felsen","birthday":"06/13"},{"id":"597846076","name":"Felix Butler","birthday":"08/15"},{"id":"598446047","name":"Michael Quinlan"},{"id":"599691778","name":"Seth Lowell","birthday":"08/30/1984"},{"id":"600175175","name":"Christopher Stålberg"},{"id":"601177614","name":"Saga Lindberg","birthday":"10/03"},{"id":"607314071","name":"Sanna Töringe","birthday":"09/28/1952"},{"id":"609900210","name":"Michael Becker","birthday":"01/18/1981"},{"id":"610292198","name":"Brendan McCarthy"},{"id":"610552674","name":"Victoria Kahn","birthday":"02/06"},{"id":"622103366","name":"Jenny Butler"},{"id":"623809740","name":"Nagesh Susarla","birthday":"01/23"},{"id":"624405899","name":"Urban S. Reininger IV"},{"id":"628235994","name":"Axel Heijkenskjöld","birthday":"03/24"},{"id":"628905143","name":"Matilda Holst"},{"id":"629436861","name":"Josepha Lindblom","birthday":"06/17"},{"id":"632770656","name":"Oscar Wetterling","birthday":"05/11/1985"},{"id":"639895437","name":"Karl Hilding Sallnäs","birthday":"03/18"},{"id":"642030648","name":"Anja Holst","birthday":"06/11/1993"},{"id":"642280528","name":"Olle Bernst Sallnäs","birthday":"07/05"},{"id":"646095901","name":"Sharon Salveter"},{"id":"646370621","name":"Helena Simonsson","birthday":"11/11/1985"},{"id":"650830933","name":"Robert Sala"},{"id":"661331173","name":"Jonte Halldén","birthday":"09/02/1974"},{"id":"665356789","name":"Ottilia Wahl","birthday":"09/18/1988"},{"id":"665826479","name":"Ted Delano","birthday":"03/23/1985"},{"id":"669288200","name":"Patricio Sebastian Pomies"},{"id":"671315337","name":"Eric Tse"},{"id":"676951290","name":"Martin Nordkvist","birthday":"07/17"},{"id":"680957604","name":"Jared Stein","birthday":"06/07"},{"id":"683749117","name":"Sebastian Holst","birthday":"12/01/1991"},{"id":"692066933","name":"Anita Chan Li","birthday":"05/10"},{"id":"696215536","name":"John Hovell","birthday":"09/16/1980"},{"id":"699700768","name":"Diem Nguyen","birthday":"10/11"},{"id":"701052428","name":"Jenny Bergdahl","birthday":"06/30"},{"id":"701740202","name":"Eoin McMillan","birthday":"02/15"},{"id":"706556407","name":"David Wahl","birthday":"10/07"},{"id":"709497904","name":"Julia Töringe","birthday":"06/01/1976"},{"id":"722216510","name":"Damon Pace","birthday":"09/01/1976"},{"id":"724770562","name":"Leo Giertz"},{"id":"727676636","name":"Peter Ehrlich","birthday":"11/17"},{"id":"745003043","name":"Seta Stålberg","birthday":"04/18"},{"id":"751931140","name":"Nisse Hvidfeldt","birthday":"12/24"},{"id":"752084513","name":"Didi Medina","birthday":"08/26"},{"id":"756460172","name":"Andreas Carlsson","birthday":"03/01/1984"},{"id":"770604344","name":"Irena Čajková","birthday":"05/30"},{"id":"784265056","name":"Amelie Coyet","birthday":"12/24/1983"},{"id":"795087866","name":"Brittony Keller"},{"id":"795793420","name":"Anders Holst"},{"id":"811325404","name":"Kartikay Khandelwal","birthday":"11/08/1987"},{"id":"824249110","name":"Sara Hickok"},{"id":"832075330","name":"Sue Ahrens Golden"},{"id":"859745724","name":"David Vignoni"},{"id":"904825202","name":"Totte Pärlefalk"},{"id":"1006744312","name":"Leonardo Cantelmo"},{"id":"1007763301","name":"Helena Sallnäs","birthday":"05/22/1957"},{"id":"1015850324","name":"Katie Maxbauer McNulty"},{"id":"1036433323","name":"Kara Stein","birthday":"05/04"},{"id":"1045205608","name":"Sara Fineman Kamen","birthday":"04/25"},{"id":"1054590049","name":"Juan Batiz-Benet"},{"id":"1059810032","name":"Susan Lin"},{"id":"1063140011","name":"Mila Schultz"},{"id":"1081371013","name":"Lucas Suarez-Orozco","birthday":"03/09"},{"id":"1094040067","name":"Michelle Wohlgemuth","birthday":"05/13/1990"},{"id":"1140413260","name":"Thatcher Peskens","birthday":"11/23/1981"},{"id":"1146212290","name":"Christian Bohland"},{"id":"1162798402","name":"Jon Manning"},{"id":"1178668389","name":"Barbara Cliff","birthday":"04/05"},{"id":"1210890769","name":"Nicole Raychev"},{"id":"1216062275","name":"Marc West","birthday":"01/01/1980"},{"id":"1227570401","name":"Eric Knudson","birthday":"05/27/1990"},{"id":"1264418040","name":"Ilene Kones Wohlgemuth","birthday":"02/06/1958"},{"id":"1270154613","name":"Michael Henretty","birthday":"03/12"},{"id":"1282681326","name":"William John O'Hearn","birthday":"04/02/1954"},{"id":"1338100090","name":"Bob Baker","birthday":"12/07"},{"id":"1381140017","name":"Shola Farber","birthday":"04/14"},{"id":"1381140063","name":"Peggy Stankevich","birthday":"12/03"},{"id":"1381140097","name":"Margaret Aldredge","birthday":"08/25"},{"id":"1381140147","name":"Maximilian Eicke"},{"id":"1381140148","name":"Christopher Impiglia"},{"id":"1381140255","name":"Jocelyn Cole","birthday":"03/30"},{"id":"1490700773","name":"Joseph Huang"},{"id":"1556197776","name":"Joy Little Tree Farber","birthday":"08/02"},{"id":"100000103042317","name":"Max Goodman"},{"id":"100000136880294","name":"Måretn Westin"},{"id":"100000455229929","name":"Peter Holst","birthday":"03/26"},{"id":"100000516121914","name":"Brian Roshon"},{"id":"100000548080083","name":"Åsa Petri"},{"id":"100000643935829","name":"Göran Stålberg","birthday":"10/11"},{"id":"100000747517261","name":"Zoe Baker","birthday":"12/06/1985"},{"id":"100000934486286","name":"Laurel Hart","birthday":"02/14"},{"id":"100001062690247","name":"Pete London","birthday":"02/25/1978"},{"id":"100001177329560","name":"Eliza Dickey"},{"id":"100001510891600","name":"Robin Gall","birthday":"12/23"},{"id":"100001514604078","name":"Gunilla Petri","birthday":"07/23/1941"},{"id":"100001663933970","name":"Daniel Stålberg"},{"id":"100001669104931","name":"Marianne Holst Anger","birthday":"04/22"},{"id":"100001708894798","name":"Mike Cuff","birthday":"12/23/1975"},{"id":"100001853111040","name":"Delyan Raychev","birthday":"11/19"},{"id":"100002912783751","name":"Teddy Cross","birthday":"05/01/1996"},{"id":"100003806026111","name":"Jane West","birthday":"01/01/1985"},{"id":"100004171892308","name":"Joe Doe","birthday":"01/01/1985"},{"id":"100004262342089","name":"Mårten Westin","birthday":"03/26/1981"}],"paging":{"next":"https://graph.facebook.com/2904387/friends?fields=id,name,birthday&access_token=AAADHOVHsvaEBAD6vI6SD690O6ZB5uqTM6xYjq7rDuBKKirnQx9dPB42YfmOQvt0tcBppzcODGJtzUvrcZCPguiy2G1BZCnMvZCRHqsqijQZDZD&limit=5000&offset=5000&__after_id=100004262342089"}}))
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
	// 	accountService.getContacts(req.session.personId, wrapRespond(req, res, 'contacts'))
	// })
	app.post('/api/message', filter.oldClientsAndSession, function postMessage(req, res) {
		var params = getParams(req, 'toConversationId', 'clientUid', 'type', 'payload')
		var prodPush = (req.headers['x-dogo-mode'] == 'appstore')
		messageService.sendMessage(req.session.personId,
			params.toConversationId, params.clientUid,
			params.type, params.payload,
			prodPush, curry(respond, req, res))
	})
	app.get('/api/messages', filter.oldClientsAndSession, function getConversationMessages(req, res) {
		var params = getParams(req, 'conversationId')
		messageService.getMessages(req.session.personId, params.conversationId, function(err, messages) {
			respond(req, res, err, !err && { messages:messages })
		})
	})
	app.post('/api/pushAuth', filter.oldClientsAndSession, function postPushAuth(req, res) {
		var params = getParams(req, 'pushToken', 'pushSystem')
		accountService.setPushAuth(req.session.personId, params.pushToken, params.pushSystem,
			curry(respond, req, res))
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
		fs.readFile(__dirname+'/../../../build/dogo-ios-build.tar', function(err, tar) {
			if (err) { return respond(req, res, err) }
			log("send download response", tar.length)
			respond(req, res, null, tar, 'application/x-tar')
		})
	})
	app.get('/api/facebookCanvas/conversation', function getFacebookConversation(req, res) {
		var params = getParams(req, 'facebookRequestId')
		messageService.loadFacebookRequestId(params.facebookRequestId, curry(respond, req, res))
	})
	app.post('/api/facebookRequests', filter.session, function saveFacebookRequest(req, res) {
		var params = getParams(req, 'facebookRequestId', 'toPersonId', 'conversationId')
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
	// TODO Start logging timing somewhere
	// log(req.method, req.url, req.meta, req.timer && req.timer.report())
}
