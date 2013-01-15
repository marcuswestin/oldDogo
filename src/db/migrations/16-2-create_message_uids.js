var util = require('./util')
var config = require('server/config/dev')

var clientUidBlockSize = 100000
var db = util.makeDatabase(config.db)

function check(err) {
	if (!err) { return }
	console.log("ERROR", err)
	throw err
}

selectData(function(accounts, messages) {
	createUniqueClientUids(accounts, messages, function() {
		console.log("All done!")
	})
})

function selectData(callback) {
	console.log("Select messages & accounts ...")
	db.select(this, 'SELECT * FROM message', [], function(err, messages) {
		check(err)
		db.select(this, 'SELECT * FROM account', [], function(err, accounts) {
			check(err)
			console.log("Select messages & accounts done!")
			callback(accounts, messages)
		})
	})
}

function createUniqueClientUids(accounts, messages, callback) {
	console.log("Create client_uids ...")
	db.transact(this, function(tx) {
		var count = 0
		var clientUidBySender = {}
		function nextAccount() {
			if (!accounts.length) { return nextMessage() }
			var account = accounts.shift()
			console.log("process account", account.id)
			tx.query(this, 'UPDATE account SET last_client_uid_block_start=?, last_client_uid_block_end=? WHERE id=?',
				[clientUidBlockSize + 1, clientUidBlockSize * 2, account.id], function(err, res) {
					check(err)
					nextAccount()
				}
			)
		}
		function nextMessage() {
			if (!messages.length) {
				tx.commit()
				tx = null
				console.log("Create client_uids done!")
				return callback()
			}
			var message = messages.shift()
			console.log("process message", message.id)
			var clientUid = clientUidBySender[message.sender_account_id] = (clientUidBySender[message.sender_account_id] || 0) + 1
			tx.query(this, 'UPDATE message SET client_uid=? WHERE id=?', [clientUid, message.id], function(err, res) {
				check(err)
				nextMessage()
			})
		}
		
		nextAccount()
	})
}

