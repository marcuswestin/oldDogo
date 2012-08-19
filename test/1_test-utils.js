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

var u = module.exports = {}
u.database = new Database({ host:'localhost', database:'dogo_test', user:'dogo_tester', password:'test' })
u.accountService = new AccountService(u.database)
u.pushService = new PushService(u.database, null, null)
u.pictureService = new PictureService(u.database, { bucket:'test' })
u.messageService = new MessageService(u.database, u.accountService, u.pushService)
u.sessionService = new SessionService(u.database, u.accountService)
u.fbAppId = '219049001532833'
u.fbAppSecret = '8916710dbc540f3d439f4f6a67a3b5e7'
u.fbAppAccessToken = '219049001532833|OyfUJ1FBjvZ3lVNjOMM3SFqm6CE'
u.router = makeRouter(u.accountService, u.messageService, u.sessionService, u.pictureService, { log:false, dev:true })

u.fbTestData = {}
var fbCacheFile = __dirname+'/.fbTestDataCache.json'
u.stashFbTestData = function(authToken) {
	u.fbTestData.dogoAuthToken = authToken
	api.authToken = u.fbTestData.dogoAuthToken
	console.log("Writing fb test data to disc", fbCacheFile)
	fs.writeFileSync(fbCacheFile, JSON.stringify(u.fbTestData))
}
u.loadFbTestData = function() {
	u.fbTestData = JSON.parse(fs.readFileSync(fbCacheFile).toString())
	api.authToken = u.fbTestData.dogoAuthToken
	console.log("Loaded fb test data from disc")
}

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

u.port = 9090
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

