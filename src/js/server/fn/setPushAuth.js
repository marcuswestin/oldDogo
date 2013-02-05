module.exports = function setPushAuth(personId, pushToken, pushType, callback) {
	if (!personId) { return callback('Missing person id') }
	if (!pushToken) { return callback('Missing push token') }
	if (!pushType) { return callback('Missing push type') }
	
	db.people(personId).selectOne('SELECT pushJson FROM person WHERE personId=?', [personId], function(err, res) {
		if (err) { return callback(err) }
		var pushInfo = JSON.parse(res.pushJson)
		pushInfo.push({ token:pushToken, type:pushType })
		db.people(personId).updateOne('UPDATE person SET pushJson=? WHERE personId=?', [JSON.stringify(pushInfo), personId], function(err) {
			callback(err)
		})
	})
}
