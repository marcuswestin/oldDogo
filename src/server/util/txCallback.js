module.exports = function txCallback(tx, callback, context) {
	return function(err, result) {
		try {
			if (err) { tx.rollback() }
			else { tx.commit() }
		} catch(e) {
			err = e
		}
		callback.call(context || this, err, result)
	}
}