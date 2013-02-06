var sendEmail = require('server/fn/sendEmail')
var registration = require('data/registration')
var lookupService = require('server/lookupService')

module.exports = function requestVerification(address, name, color, password, callback) {
	var error = registration.checkAll({ name:name, color:color, address:address, password:password })
	if (error) { return callback(error) }
	
	if (!Addresses.isEmail(address)) { return callback("Unimplemented: requestVerification for type "+address.addressType) }
	
	lookupService.lookup(address, function(err, personId, addrInfo) {
		if (err) { return callback(err) }
		if (personId) { return callback(address.addressId+' is already used') }
		password.createHash(password, function(err, passwordHash) {
			if (err) { return callback(err) }
			var token = uuid.v4()
			lookupService.createVerification(token, passwordHash, name, color, address, function(err, verificationId) {
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
