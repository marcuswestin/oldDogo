module.exports = {
	verifyFormat:verifyFormat,
	verifyEmailFormat:verifyEmailFormat,
	verifyPhoneFormat:verifyPhoneFormat,
	verifyFacebookFormat:verifyFacebookFormat,
	
	isEmail:isEmail,
	isFacebook:isFacebook,
	isPhone:isPhone,
	
	address:address,
	email:email,
	facebook:facebook,
	phone:phone,
	
	fromVerificationParams:fromVerificationParams
}

var types = ['phone', 'email', 'facebook']

function fromVerificationParams(params) {
	// e.g /verify?i=123&t=abc&email=narcvs%40gmail.com or /verify?i=123&t=abc&phone=%2B14124238669
	for (var i=0; i<types.length; i++) {
		var type = types[i]
		if (params[type]) { return address(type, params[type]) }
	}
}

/* Type inquires
 ***************/
function isPhone(address) { return address.addressType == 'phone' }
function isEmail(address) { return address.addressType == 'email' }
function isFacebook(address) { return address.addressType == 'facebook' }

/* Address makers
 ****************/
function email(emailAddress, name) { return address('email', emailAddress, name) }
function facebook(facebookId, name) { return address('facebook', facebookId, name) }
function phone(phoneNumber, name) { return address('phone', phoneNumber, name) }
function address(addressType, addressId, name) {
	var addrInfo = { addressType:addressType, addressId:addressId, toString:addressToString }
	if (name) { addrInfo.name = name }
	return addrInfo
}
function addressToString() { return this.addressId }

/* Address format checks.
 ************************/
function verifyFormat(address) {
	if (address.addressType == 'email') { return verifyEmailFormat(address.addressId) }
	if (address.addressType == 'facebook') { return verifyFacebookFormat(address.addressId) }
	if (address.addressType == 'phone') { return verifyPhoneFormat(address.addressId) }
}

var domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}$/
function verifyEmailFormat(address) {
	var parts = address.split('@')
	return (parts.length == 2) && (parts[0].length >= 1) && domainRegex.test(parts[1])
}

function verifyPhoneFormat(address) {
	// US addresses only for now
	return address[0] == '1' & address.length == 1 + 10
}

function _isNumber(address) { return parseInt(address, 10) == address }
function verifyFacebookFormat(address) {
	return _isNumber(address)
}
