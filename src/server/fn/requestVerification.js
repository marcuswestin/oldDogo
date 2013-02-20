var sendEmail = require('server/fn/sendEmail')
var registration = require('data/registration')
var createPasswordHash = require('server/fn/createPasswordHash')
var url = require('std/url')

module.exports = function requestVerification(address, name, password, pictureSecret, callback) {
	var error = registration.checkAll({ name:name, address:address, password:password })
	if (error) { return callback(error) }
	
	if (!Addresses.isEmail(address)) { return callback("Unimplemented: requestVerification for type "+address.addressType) }
	
	parallel(_lookupAddress, _hashPassword, function(err, addrInfo, passwordHash) {
		if (err) { return callback(err) }
		lookupService.createAddressVerification(passwordHash, name, address, pictureSecret, function(err, verificationId, verificationToken) {
			if (err) { return callback(err) }
			var verifyParams = { i:verificationId, t:verificationToken }
			verifyParams[address.addressType] = address.addressId
			var verifyLink = gConfig.serverUrl+'/verify?'+url.query.string(verifyParams)
			var text = 'Please verify your email address by visiting this link: '+verifyLink
			var html = 'Please verify your email address by visiting this link: <a href="'+verifyLink+'">'+verifyLink+'</a>'
			log.debug('sending welcome email', address.addressId, verificationId)
			sendEmail('Dogo <welcome@dogo.co>', address.addressId, 'Verify '+address.addressId, html, text, function(err) {
				if (err) {
					log.error('Error sending email to SES', err.code, err.document)
					return callback(err)
				}
				var params = { verificationId:verificationId }
				if (gConfig.dev) { params.devVerifyLink = verifyLink }
				
				callback(null, params)
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
	
	lookupService.lookup(address, function(err, personId, addrInfo) {
		if (err) { return callback(err) }
		if (personId) {  }
		createPasswordHash(password, function(err, passwordHash) {
			if (err) { return callback(err) }
		})
	})
}
