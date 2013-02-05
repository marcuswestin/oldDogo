var sendEmail = require('server/fn/sendEmail')

module.exports = function requestVerification(name, color, email, password, callback) {
	var error = registration.checkAll({ name:name, color:color, email:email, password:password })
	if (error) { return callback(error) }
	
	lookupService.lookupEmail(email, function(err, personId, addrInfo) {
		if (err) { return callback(err) }
		if (personId) { return callback('That email is already used') }
		password.createHash(password, function(err, passwordHash) {
			if (err) { return callback(err) }
			var token = uuid.v4()
			var sql = 'INSERT INTO addressVerification SET token=?, passwordHash=?, name=?, color=?, addressId=?, addressType=?, createdTime=?'
			db.lookup().insert(sql, [token, passwordHash, name, color, email, Addresses.types.email, db.time()], function(err, verificationId) {
				if (err) { return callback(err) }
				var url = 'https://dogoapp.com/v?i='+verificationId+'&t='+token
				var text = 'Please verify your email address by visiting this link: '+url
				var html = 'Please verify your email address by visiting this link: <a href="'+url+'">'+url+'</a>'
				sendEmail('welcome@dogo.com', email, 'Verify your address', html, text, function(err) {
					if (err) { return callback(err) }
					if (gConfig.dev) { return callback(null, { devVerificationUrl:url }) }
					else { return callback(null, {}) }
				})
			})
		})
	})
}
