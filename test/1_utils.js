require('../src/globals')

var exec = require('child_process').exec,
	path = require('path')
	Database = require('../src/server/Database'),
	MessageService = require('../src/server/MessageService'),
	AccountService = require('../src/server/AccountService'),
	SessionService = require('../src/server/SessionService'),
	assert = require('assert'),
	fs = require('fs'),
	time = require('fun/node_modules/std/time')

var u = module.exports = {
	setupDatabase:setupDatabase,
	clearTables:clearTables,
	checkConnectionLeaks:checkConnectionLeaks
}

var db = u.database = new Database('localhost', 'dogo_test', 'dogo_tester', 'test'),
	accs = u.accountService = new AccountService(u.database),
	ms = u.messageService = new MessageService(u.database, u.accountService),
	ss = u.sessionService = new SessionService(u.accountService),
	check = u.check = function(err) { if (err) { throw err } },
	is = u.is = function(a, b) {
		if (arguments.length == 1) {
			assert(a)
		} else if (arguments.length == 2) {
			assert.equal(a, b)
		} else {
			throw new Error("Too many arguments for is()")
		}
	}

u.fbAppId = '219049001532833'
u.fbAppSecret = '8916710dbc540f3d439f4f6a67a3b5e7'
u.fbAppAccessToken = '219049001532833|OyfUJ1FBjvZ3lVNjOMM3SFqm6CE'
u.fbTestUsers = null
var fbTestDataFile = __dirname+'/.fbTestUsers.json'
try {
	var fbTestUsersData = JSON.parse(fs.readFileSync(fbTestDataFile).toString())
	if (fbTestUsersData && (new Date().getTime() - fbTestUsersData.time < 1.5 * time.hours)) {
		u.fbTestUsers = fbTestUsersData.users
	}
} catch(e) { console.log("Error opening") }

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
	var setupSql = path.join(__dirname, '../schema.sql')
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
