var util = require('./util')
var config = require('../../src/server/config/dev')

var clientUidBlockSize = 100000
var db = util.makeDatabase(config.db)

function check(err, tx) {
	if (!err) { return }
	console.log("ERROR", err)
	if (tx) { rollback(tx) }
	throw err
}

function rollback(tx) {
	console.log("Rolling back ...")
	tx.rollback()
	console.log("Rolling back DONE")
}



console.log("Select messages & accounts ...")
selectData(function(accounts, messages) {
	addColumns(function() {
		createUniqueClientUids(accounts, messages, function() {
			addClientUidIndex(function() {
				console.log("DONE!")
			})
		})
	})
})

function selectData(callback) {
	db.select(this, 'SELECT * FROM message', [], function(err, messages) {
		check(err)
		db.select(this, 'SELECT * FROM account', [], function(err, accounts) {
			check(err)
			console.log("Select messages & accounts DONE")
			callback(accounts, messages)
		})
	})
}

function addColumns(callback) {
	console.log("Add columns ...")
	var addColumnsSql = [
		'ALTER TABLE message ADD COLUMN client_uid BIGINT UNSIGNED NOT NULL AFTER sent_time',
		'ALTER TABLE account ADD COLUMN last_client_uid_block_start BIGINT UNSIGNED NOT NULL AFTER facebook_id',
		'ALTER TABLE account ADD COLUMN last_client_uid_block_end BIGINT UNSIGNED NOT NULL AFTER last_client_uid_block_start'].join(';\n')
	db.query(this, addColumnsSql, [], function(err, res) {
		check(err)
		console.log("Add columns DONE")
		callback()
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
					check(err, tx)
					nextAccount()
				}
			)
		}
		function nextMessage() {
			if (!messages.length) {
				tx.commit()
				tx = null
				console.log("Create client_uids DONE")
				return callback()
			}
			var message = messages.shift()
			console.log("process message", message.id)
			var clientUid = clientUidBySender[message.sender_account_id] = (clientUidBySender[message.sender_account_id] || 0) + 1
			tx.query(this, 'UPDATE message SET client_uid=? WHERE id=?', [clientUid, message.id], function(err, res) {
				check(err, tx)
				nextMessage()
			})
		}
		
		nextAccount()
	})
}

function addClientUidIndex(callback) {
	console.log("Add message index_sender_account_id_client_uid index ...")
	db.query(this, 'ALTER TABLE message ADD UNIQUE KEY index_sender_account_id_client_uid (sender_account_id, client_uid)', [], function(err, res) {
		check(err)
		console.log("Add message index_sender_account_id_client_uid index DONE")
		callback()
	})
}