var sendEmail = require('server/fn/sendEmail')
var registration = require('data/registration')
var createPasswordHash = require('server/fn/createPasswordHash')

module.exports = function requestVerification(address, name, color, password, pictureFile, callback) {
	var error = registration.checkAll({ name:name, color:color, address:address, password:password })
	if (error) { return callback(error) }
	
	if (!Addresses.isEmail(address)) { return callback("Unimplemented: requestVerification for type "+address.addressType) }
	
	parallel(_lookupAddress, _hashPassword, _uploadPicture, function(err, addrInfo, passwordHash, pictureSecret) {
		if (err) { return callback(err) }
		lookupService.createAddressVerification(passwordHash, name, color, address, pictureSecret, function(err, verificationId, verificationToken) {
			if (err) { return callback(err) }
			var url = 'https://dogoapp.com/v?i='+verificationId+'&t='+verificationToken
			var text = 'Please verify your email address by visiting this link: '+url
			var html = 'Please verify your email address by visiting this link: <a href="'+url+'">'+url+'</a>'
			sendEmail('welcome@dogo.com', address.addressId, 'Verify your address', html, text, function(err) {
				if (err) { return callback(err) }
				if (gConfig.dev) { return callback(null, { devVerificationUrl:url }) }
				else { return callback(null, {}) }
			})
		})
	})
	
	function _lookupAddress(callback) {
		lookupService.lookup(address, function(err, personId, addrInfo) {
			if (err) { return callback(err) }
			if (personId) { return callback(address.addressId+' is already used') }
			callback(null, addrInfo)
		})
	}
	function _hashPassword(callback) {
		createPasswordHash(password, callback)
	}
	function _uploadPicture(callback) {
		payloadService.uploadPersonPicture(pictureFile, callback)
	}
	
	lookupService.lookup(address, function(err, personId, addrInfo) {
		if (err) { return callback(err) }
		if (personId) {  }
		createPasswordHash(password, function(err, passwordHash) {
			if (err) { return callback(err) }
		})
	})
}
