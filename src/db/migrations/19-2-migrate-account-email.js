var util = require('./util')
var config = require('server/config/dev')
var db = util.makeDatabase(config.db)

function check(err) {
	if (!err) { return }
	console.log("ERROR", err)
	throw err
}

selectData(function(accounts) {
	createAccountEmailRows(accounts, function() {
		console.log("All done!")
	})
})

function selectData(callback) {
	console.log("Select accounts ...")
	db.select(this, 'SELECT * FROM account', [], function(err, accounts) {
		check(err)
		console.log("Select accounts done!")
		callback(accounts)
	})
}

function createAccountEmailRows(accounts, callback) {
	console.log("Create account email rows...")
	db.transact(this, function(tx) {
		serialMap(accounts, {
			iterate:function(account, next) {
				if (!account.email) {
					console.log("skipping account with no email", account.id, account.full_name)
					return next()
				}
				console.log("Process", account.id, account.full_name, account.email)
				tx.insertIgnoreDuplicateEntry(this,
					'INSERT INTO account_email SET account_id=?, email_address=?, created_time=?, claimed_time=?',
					[account.id, account.email, account.claimed_time, account.email_verified_time],
					next
				)
			},
			finish:function(err) {
				check(err)
				console.log("Done creating account email rows!")
				tx.commit()
				callback()
			}
		})
	})
}
