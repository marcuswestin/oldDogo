require('../src/server/util/globals')

var exec = require('child_process').exec,
	path = require('path')
	Database = require('../src/server/Database'),
	MessageService = require('../src/server/MessageService'),
	AccountService = require('../src/server/AccountService'),
	PictureService = require('../src/server/PictureService'),
	SessionService = require('../src/server/SessionService'),
	PushService = require('../src/server/PushService'),
	assert = require('assert'),
	fs = require('fs'),
	time = require('std/time')

var u = module.exports = {
	checkConnectionLeaks:checkConnectionLeaks
}

u.database = new Database({ host:'localhost', database:'dogo_test', user:'dogo_tester', password:'test' })
u.accountService = new AccountService(u.database)
u.pushService = new PushService(u.database, null, null)
u.pictureService = new PictureService(u.database, { bucket:'test' })
u.messageService = new MessageService(u.database, u.accountService, u.pushService)
u.sessionService = new SessionService(u.database, u.accountService)
u.fbAppId = '219049001532833'
u.fbAppSecret = '8916710dbc540f3d439f4f6a67a3b5e7'
u.fbAppAccessToken = '219049001532833|OyfUJ1FBjvZ3lVNjOMM3SFqm6CE'
u.fbTestData = null

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

describe('A test', function() {
	it('should run', function(done) {
		u.is(!!proto)
		done()
	})
})

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

function checkConnectionLeaks(done) {
	var db = u.database
	assert.equal(db._queue.length, 0, 'There are still queries in the queue')
	assert.equal(db._pool.length, db._poolSize, (db._poolSize - db._pool.length) + ' connection(s) leaked!!')
	done()
}
