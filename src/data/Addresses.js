var Addresses = module.exports = {
	verifyFormat:verifyFormat,
	verifyEmailFormat:verifyEmailFormat,
	verifyPhoneFormat:verifyPhoneFormat,
	verifyFacebookFormat:verifyFacebookFormat,
	
	isDogo:isDogo,
	isEmail:isEmail,
	isFacebook:isFacebook,
	isPhone:isPhone,
	
	normalize:normalize,
	normalizeEmail:normalizeEmail,
	normalizePhone:normalizePhone,
	
	address:address,
	email:email,
	facebook:facebook,
	phone:phone,
	
	isFacebookProxyEmail:isFacebookProxyEmail,
	fromVerificationParams:fromVerificationParams,
	equal:equal,
	
	types: { 'dogo':1, 'email':2, 'phone':3, 'facebook':4 },
	
	hasImage:hasImage
}

function hasImage(contact) {
	return Addresses.isDogo(contact) || contact.hasLocalImage || Addresses.isFacebook(contact)
}

function isFacebookProxyEmail(email) {
	return /@proxymail.facebook.com/.test(email)
}

function fromVerificationParams(params) {
	// e.g /verify?i=123&t=abc&email=narcvs%40gmail.com or /verify?i=123&t=abc&phone=%2B14124238669
	for (var typeName in Addresses.types) {
		if (params[typeName]) { return address(Addresses.types[typeName], params[typeName]) }
	}
}

function equal(a, b) {
	return a.addressType == b.addressType && a.addressId == b.addressId
}

/* Normalization
 ***************/
var normalizers = {}
normalizers[Addresses.types.email] = normalizeEmail
normalizers[Addresses.types.phone] = normalizePhone
function normalize(address) {
	if (!normalizers[address.addressType]) { return }
	address.addressId = normalizers[address.addressType](address.addressId)
}
function normalizeEmail(email) {
	return email.toLowerCase()
}
function normalizePhone(phone) {
	phone = phone.replace(/[^\d\+]/g, '')
	if (phone[0] != '+') { return '+1'+phone }
	return phone
}

/* Type inquires
 ***************/
function isDogo(address) { return address.addressType == Addresses.types.dogo }
function isPhone(address) { return address.addressType == Addresses.types.phone }
function isEmail(address) { return address.addressType == Addresses.types.email }
function isFacebook(address) { return address.addressType == Addresses.types.facebook }

/* Address makers
 ****************/
function email(emailAddress, name) { return address(Addresses.types.email, emailAddress, name) }
function facebook(facebookId, name) { return address(Addresses.types.facebook, facebookId, name) }
function phone(phoneNumber, name) { return address(Addresses.types.phone, phoneNumber, name) }
function address(addressType, addressId, name) {
	var addrInfo = { addressType:addressType, addressId:addressId }
	if (name) { addrInfo.name = name }
	return addrInfo
}

/* Address format checks.
 ************************/
function verifyFormat(address) {
	if (address.addressType == Addresses.types.email) { return verifyEmailFormat(address.addressId) }
	if (address.addressType == Addresses.types.facebook) { return verifyFacebookFormat(address.addressId) }
	if (address.addressType == Addresses.types.phone) { return verifyPhoneFormat(address.addressId) }
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
