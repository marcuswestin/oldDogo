module.exports = {
	checkAll:checkAll,
	checkName:checkName,
	checkEmail:checkEmail,
	checkPassword:checkPassword
}

function checkAll(params) {
	var error
	if (error = checkName(params.name)) { return error }
	if (error = checkColor(params.color)) { return error }
	if (error = checkEmail(params.email)) { return error }
	if (error = checkPassword(params.password)) { return error }
}

function checkColor(color) {
	'Color check not yet implemented'
}

function checkName(name) {
	if (!name) { return 'First and last name please.' }
	var nameParts = name.split(' ')
	if (nameParts.length <= 1 || nameParts[0].length < 2 || nameParts[1].length < 2) {
		return 'First and last name please.'
	}
	if (name.length > 255) {
		return 'That name seems far too long'
	}
}

function checkEmail(email) {
	if (!Addresses.verifyFormat({ addressType:'email', addressId:email })) {
		return 'Check your email address.'
	}
}

function checkPassword(password) {
	if (password.length < 6) {
		return 'Passwords must be at least 6 characters'
	}
}