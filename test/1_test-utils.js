require('../src/server/util/globals')

var exec = require('child_process').exec
var path = require('path')
var Database = require('../src/server/Database')
var MessageService = require('../src/server/MessageService')
var AccountService = require('../src/server/AccountService')
var PictureService = require('../src/server/PictureService')
var SessionService = require('../src/server/SessionService')
var PushService = require('../src/server/PushService')
var assert = require('assert')
var fs = require('fs')
var time = require('std/time')
var request = require('request')
var makeRouter = require('../src/server/makeRouter')
var conf = require('../src/server/config/test')

var u = module.exports = {}
u.database = new Database({ host:conf.db.host, database:conf.db.database, user:conf.db.user, password:conf.db.password })
u.accountService = new AccountService(u.database)
u.pushService = new PushService(u.database, null, null)
u.pictureService = new PictureService(u.database, { bucket:conf.s3.bucket })
u.messageService = new MessageService(u.database, u.accountService, u.pushService)
u.sessionService = new SessionService(u.database, u.accountService)
u.fbAppId = '219049001532833'
u.fbAppSecret = '8916710dbc540f3d439f4f6a67a3b5e7'
u.fbAppAccessToken = '219049001532833|OyfUJ1FBjvZ3lVNjOMM3SFqm6CE'
u.router = makeRouter(u.accountService, u.messageService, u.sessionService, u.pictureService, { log:false, dev:true })
u.clientUid = function() { return u.clientUid._unique++ }
u.clientUid._unique = new Date().getTime()

;(function(){
	// HACK
	for (var i=0, arg; arg=process.argv[i]; i++) {
		if (arg == '--dogo-test-offline=yes') {
			var facebook = require('../src/server/util/facebook')
			facebook.get = facebook.post = function intercept(path, params, callback) {
				if (path == '/oauth/access_token') {
					var data = { 'access_token':'OFFLINE_ACCESS_TOKEN_FROM_TEST_UTILS.js' }
				} else if (path.match(/\/\d+\/accounts\/test-users/)) {
					var data = {"data":[{"id":"100003761823774","access_token":"AAADHOVHsvaEBAFafnqUrpXveg4gdWvmVY275yXqzfONDypWlFb1a3VxopJUlVxaJcJZBOooLYy2xsOyBh3Nmu5mZBjkjSj2xgYsZADfg0xzE2YFq4oF","login_url":"https:\/\/www.facebook.com\/platform\/test_account_login.php?user_id=100003761823774&n=NSAKf4ANvQpKU2W"},{"id":"100003776193741","access_token":"AAADHOVHsvaEBADStQGOBgs2QuAG07dWZBRFRL7ZAIZC4UHaZAf4MuPCMOKIDbZBlmWiEJDMYqOHNka1TGhilLVlGZCvsLS0hm9ye0ok5vCCYe0XSfXN03u","login_url":"https:\/\/www.facebook.com\/platform\/test_account_login.php?user_id=100003776193741&n=tEVxpNEOHPBzImV"},{"id":"100003790593619","access_token":"AAADHOVHsvaEBAPg70YSz79m6Du50CK7YzTuSRnRTDTigsO8sObieUB2PmdlwO6l8ZC7h4jyqZAPuZCZBvkrGWoYRebDKxgC8LsO5YuZC4bq9LZChc6v7JY","login_url":"https:\/\/www.facebook.com\/platform\/test_account_login.php?user_id=100003790593619&n=4bNeewlHqppzRqP"},{"id":"100003791163745","access_token":"AAADHOVHsvaEBAEDy2A3U6bohX2iXZBmkZChOXsJhMHt279r8vFYBEzcPKZAkyGxBwicGhDBTjFIA4pMc5a7QoC13HB0LN6fald9SZCeUTtmFaV1QQAVP","login_url":"https:\/\/www.facebook.com\/platform\/test_account_login.php?user_id=100003791163745&n=cip0Z83OUHlW4T3"}]}
				} else if (path == '/me') {
					var data = {"id":"100003761823774","name":"Tom Bull","first_name":"Tom","last_name":"Bull","link":"http:\/\/www.facebook.com\/profile.php?id=100003761823774","gender":"female","timezone":0,"locale":"en_US","updated_time":"2012-04-18T05:41:31+0000"}
				} else if (path == '/me/friends') {
					var data = {"data":[{"name":"John Cowp","id":"100003776193741"},{"name":"Ash Bake","id":"100003790593619"}],"paging":{"next":"https:\/\/graph.facebook.com\/100003761823774\/friends?access_token=AAADHOVHsvaEBAFafnqUrpXveg4gdWvmVY275yXqzfONDypWlFb1a3VxopJUlVxaJcJZBOooLYy2xsOyBh3Nmu5mZBjkjSj2xgYsZADfg0xzE2YFq4oF&limit=5000&offset=5000&__after_id=100003790593619"}}
				} else {
					throw new Error("Unknown facebook request path for offline test mode: "+path)
				}
				callback(null, data)
			}
		}
		if (arg == '--dogo-test-verbose=no') {
			require('../src/server/util/log').doLog = function() { /* ignore */ }
		}
	}
}())

u.pushService.testCount = 0
u.pushService.sendMessagePush = function() {
	u.pushService.testCount += 1
}

u.check = function(err) { if (err) { throw err } }
u.is = function(a, b) {
	if (arguments.length == 1) {
		assert(a)
	} else if (arguments.length == 2) {
		assert.equal(a, b)
	} else {
		throw new Error("Too many arguments for is()")
	}
}

u.port = conf.port
var api = u.api = {
	post: function(path, params, callback) { api.send('post', path, params, callback) },
	get: function(path, params, callback) {
		if (!callback) {
			callback = params
			delete params
		}
		api.send('get', path, params, callback)
	},
	send: function(method, path, params, callback) {
		if (!callback) {
			callback = params
			params = {}
		}

		var auth = api.authToken ? (api.authToken + '@') : ''
		var url = 'http://'+auth+'localhost:'+u.port+'/api/'+path
		if (method == 'GET') {
			var body = params ? JSON.stringify(params) : ''
			var qs = null
		} else {
			var body = ''
			var qs = params
		}
		var headers = {}
		if (body) {
			headers['Content-Type'] = 'application/json'
			headers['Content-Length'] = body.length
		}
		request[method]({ url:url, headers:headers, body:body, qs:qs }, function(err, res) {
			if (err) { return callback(err) }
			if (res.statusCode != 200) { return callback(new Error('Non-200 status code: '+res.statusCode+'. '+url)) }
			try { var data = JSON.parse(res.body) }
			catch(e) { return callback(e, null) }
			callback(null, data)
		})
	}
}

describe('A test', function() {
	it('should run', function(done) {
		u.is(!!proto)
		done()
	})
})

describe('API Server', function() {
	it('should start', function(done) {
		u.router.listen(u.port)
		done()
	})
	it('should be reachable', function(done) {
		api.get('ping', done)
	})
})

// function checkConnectionLeaks(done) {
// 	var db = u.database
// 	assert.equal(db._queue.length, 0, 'There are still queries in the queue')
// 	assert.equal(db._pool.length, db._poolSize, (db._poolSize - db._pool.length) + ' connection(s) leaked!!')
// 	done()
// }

// function resetDogoData(done) {
// 	var db = u.database
// 	db.query(this, 'SHOW TABLES', [], function(err, res) {
// 		u.check(err)
// 		var tables = map(res, function(row) {
// 			return row['Tables_in_dogo_test']
// 		})
// 		;(function next() {
// 			if (!tables || !tables.length) {
// 				return done()
// 			}
// 			var table = tables.pop()
// 			if (!table || table == 'facebook_contact') {
// 				return next() // Keep facebook contacts in system to avoid facebook connecting again
// 			}
// 			db.query(this, 'set foreign_key_checks = 0; TRUNCATE TABLE '+ table + '; set foreign_key_checks = 1;', [], function(err) {
// 				u.check(err)
// 				next()
// 			})
// 		}())
// 	})
// }
    
// function resetDatabase(done) {
// 	exec('make reset-test-db', function(err, stdout, stderr) {
// 		u.check(err)
// 		u.is(!stderr)
// 		done()
// 	})
// }

