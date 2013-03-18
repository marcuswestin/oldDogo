var log = makeLog('setPushAuth')

module.exports = function setPushAuth(personId, pushToken, pushType, callback) {
	if (!personId) { return callback('Missing person id') }
	if (!pushToken) { return callback('Missing push token') }
	if (!pushType) { return callback('Missing push type') }
	
	log('select pushJson')
	db.person(personId).selectOne('SELECT pushJson FROM person WHERE personId=?', [personId], function(err, res) {
		if (err) { return callback(err) }
		if (!res) { return callback('Unknown person') }
		var pushInfo = jsonList(res.pushJson)
		pushInfo.push({ token:pushToken, type:pushType })
		log('update pushJson', pushInfo)
		db.person(personId).updateOne('UPDATE person SET pushJson=? WHERE personId=?', [JSON.stringify(pushInfo), personId], function(err) {
			log('done', err)
			callback(err, 'ok')
		})
	})
}
