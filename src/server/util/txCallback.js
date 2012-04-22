module.exports = function txCallback(tx, callback) {
	return function(err, result) {
		try {
			if (err) { tx.rollback() }
			else { tx.commit() }
		} catch(e) {
			err = e
		}
		callback(err, result)
	}
}