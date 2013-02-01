var types = { 'facebook':2, 'email':3, 'phone':4 }
module.exports = {
	types:types,
	type:types,
	verifyFormat:verifyFormat
}

function isType(typeToTest, typeName) {
	return (typeof typeToTest == 'number') ? (typeToTest == types[typeName]) : (typeToTest == typeName)
}

function isEmail(type) { return isType(type, 'email') }
function isFacebook(type) { return isType(type, 'facebook') }
function isPhone(type) { return isType(type, 'phone') }

function isNumber(address) { return parseInt(address, 10) == address }

function verifyFormat(type, address) {
	if (isEmail(type)) { return verifyEmailFormat(address) }
	if (isFacebook(type)) { return isNumber(address) }
	if (isPhone(type)) { return verifyPhoneFormat(address) }
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
