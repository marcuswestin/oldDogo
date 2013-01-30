var util = require('./util')
var config = require('server/config/dev/devConfig')
var db = util.makeDatabase(config.db)
var orderConversationIds = require('server/util/ids').orderConversationIds

// For every facebook_contact, create an account and a conversation between the facebook_contact's owning account and the newly created account

function check(err) {
	if (!err) { return }
	console.log("ERROR", err)
	throw err
}

var accounts = {}

selectData(function(contacts) {
	createData(contacts, function() {
		console.log("All done!")
	})
})

function selectData(callback) {
	console.log("Select facebook contacts ...")
	db.select(this, 'SELECT account_id, contact_facebook_id, contact_facebook_name FROM facebook_contact', [], function(err, contacts) {
		check(err)
		asyncMap(contacts, {
			iterate:function processContact(contact, i, next) {
				if (!contact) { process.exit() }
				if (accounts[contact.account_id]) {
					next(null, contact)
				} else {
					db.selectOne(this, 'SELECT * FROM account WHERE id=?', [contact.account_id], function(err, account) {
						accounts[contact.account_id] = account
						next(null, contact)
					})
				}
			},
			finish:function onDone(err) {
				check(err)
				console.log("Select facebook contacts done!")
				callback(contacts)
			}
		})
	})
}

function createData(contacts, callback) {
	console.log('Create accounts...')
	db.transact(this, function(tx) {
		asyncMap(contacts, {
			iterate: function(contact, next) {
				var fromAccount = accounts[contact.account_id]
				// create account for contact.contact_facebook_id, if not exists
				console.log("process contact", contact)
				tx.insertIgnoreDuplicate(
					'INSERT INTO account SET facebook_id=?, full_name=?, created_time=?',
					[contact.contact_facebook_id, contact.contact_facebook_name, fromAccount.claimed_time],
					function(err) {
						check(err)
						// create conversation between contact.account_id and account-with-fb-account-id
						tx.selectOne(this, "SELECT id FROM account WHERE facebook_id=?", [contact.contact_facebook_id], function(err, res) {
							check(err)
							var ids = orderConversationIds(res.id, contact.account_id)
							tx.insertIgnoreDuplicate(
								'INSERT INTO conversation SET account_1_id=?, account_2_id=?, created_time=?',
								[ids.account1Id, ids.account2Id, fromAccount.claimed_time],
								function(err) {
									check(err)
									tx.selectOne(this, "SELECT id FROM conversation WHERE account_1_id=? AND account_2_id=?", [ids.account1Id, ids.account2Id], function(err, res) {
										check(err)
										tx.insertIgnoreDuplicate(
											'INSERT INTO conversation_participation SET conversation_id=?, account_id=?', [res.id, ids.account1Id],
											function(err) {
												check(err)
												tx.insertIgnoreDuplicate(
													'INSERT INTO conversation_participation SET conversation_id=?, account_id=?', [res.id, ids.account2Id],
													function(err) {
														check(err)
														next()
													}
												)
											}
										)
									})
								}
							)
						})
					}
				)
			},
			finish: function(err, contacts) {
				check(err)
				console.log("Done creating accounts")
				tx.commit()
				callback()
			}
		})
	})
}
