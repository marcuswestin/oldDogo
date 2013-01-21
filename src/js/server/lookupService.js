var db = require('server/Database')

module.exports = {
	lookupPersonIdByEmailAddress: lookupPersonIdByEmailAddress,
	indexPersonIdByEmailAddress: indexPersonIdByEmailAddress,
	lookupPersonIdByFacebookId: lookupPersonIdByFacebookId,
	indexPersonIdByFacebookId: indexPersonIdByFacebookId,
	indexPersonIdByFacebookAccount: indexPersonIdByFacebookAccount
}

function lookupPersonIdByEmailAddress(emailAddress, callback) {
	db.lookupShard.selectOne('SELECT personId FROM personEmail WHERE emailAddress=?', [emailAddress], function(err, res) {
		callback(err, res && res.personId)
	})
}

function indexPersonIdByEmailAddress(emailAddress, personId, callback) {
	db.lookupShard.insertIgnoreDuplicate(
		'INSERT INTO personEmail SET emailAddress=?, personId=?, createdTime=?',
		[emailAddress, personId, db.time()],
		callback
	)
}

function lookupPersonIdByFacebookId(facebookId, callback) {
	db.lookupShard.selectOne('SELECT personId FROM personFacebook WHERE facebookId=?', [facebookId], function(err, res) {
		callback(err, res && res.personId)
	})
}

function indexPersonIdByFacebookId(facebookId, personId, callback) {
	db.lookupShard.insertIgnoreDuplicate(
		'INSERT INTO personFacebook SET facebookId=?, personId=?, createdTime=?',
		[facebookId, personId, db.time()],
		callback
	)
}

function indexPersonIdByFacebookAccount(fbAcc, personId, callback) {
	indexPersonIdByFacebookId(fbAcc.id, personId, function(err) {
		if (err) { return callback(err) }
		if (fbAcc.email && fbAcc.email.match(/proxymail.facebook.com$/)) {
			indexPersonIdByEmailAddress(fbAcc.email, personId, callback)
		} else {
			callback()
		}
	})
}
