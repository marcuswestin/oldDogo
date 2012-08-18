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
	setupDatabase:setupDatabase,
	clearTables:clearTables,
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
u.fbTestUsers = null
var fbTestDataFile = __dirname+'/.fbTestUsers.json'

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

var check = u.check,
	is = u.is,
	db = u.database
try {
	var fbTestUsersData = JSON.parse(fs.readFileSync(fbTestDataFile).toString())
	if (fbTestUsersData && (new Date().getTime() - fbTestUsersData.time < 1.5 * time.hours)) {
		u.fbTestUsers = fbTestUsersData.users
	}
} catch(e) { console.log("Error opening".magenta, fbTestDataFile) }

u.setFbTestUsers = function(fbTestUsers) {
	var fbTestUsersData = { time:new Date().getTime(), users:fbTestUsers }
	fs.writeFileSync(fbTestDataFile, JSON.stringify(fbTestUsersData))
	u.fbTestUsers = fbTestUsers
}

describe('A test', function() {
	it('should run', function(done) {
		is(!!proto)
		done()
	})
})

function setupDatabase(done) {
	var setupSql = path.join(__dirname, '../db/schema.sql')
	exec('cat '+setupSql+' | mysql -u dogo_tester --password=test', function(err, stdout, stderr) {
		check(err)
		is(!stderr)
		done()
	})
}

function clearTables(done) {
	db.query(this, 'SHOW TABLES', [], function(err, res) {
		is(!err)
		var tables = map(res, function(row) {
			return row['Tables_in_dogo_test'] // awkward
		})

		var count = tables.length,
			rootPhone = PhoneNumber.normalize(u.rootPhone)
		each(tables, function(table) {
			db.query(this, 'TRUNCATE TABLE '+ table, [], function(err) {
				is(!err)
				if (--count) { return  }
				db.query(this, 'INSERT INTO phone_address SET name=?', [rootPhone.getName()], function(err) {
					is(!err)
					done()
				})
			})
		})
	})
}

function checkConnectionLeaks(done) {
	assert.equal(db._queue.length, 0, 'There are still queries in the queue')
	assert.equal(db._pool.length, db._poolSize, (db._poolSize - db._pool.length) + ' connection(s) leaked!!')
	done()
}
