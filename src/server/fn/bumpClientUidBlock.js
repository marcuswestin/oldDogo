module.exports = function bumpClientUidBlock(personId, callback) {
	var clientUidBlockSize = 100000
	db.person(personId).transact(function(err, tx) {
		if (err) { return callback(err) }
		callback = tx.wrapCallback(callback)
		var sql = 'SELECT lastClientUidBlockStart AS start, lastClientUidBlockEnd AS end FROM person WHERE personId=?'
		tx.selectOne(sql, [personId], function(err, clientUidBlock) {
			if (err) { return callback(err) }
			clientUidBlock.start += clientUidBlockSize
			clientUidBlock.end += clientUidBlockSize
			var sql = 'UPDATE person SET lastClientUidBlockStart=?, lastClientUidBlockEnd=? WHERE personId=?'
			tx.updateOne(sql, [clientUidBlock.start, clientUidBlock.end, personId], function(err) {
				if (err) { return callback(err) }
				callback(null, clientUidBlock)
			})
		})
	})
}
