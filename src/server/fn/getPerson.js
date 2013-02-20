module.exports = getPerson
getPerson.andPasswordHash = getPersonAndPasswordHash

function getPerson(personId, callback) {
	var sql = 'SELECT facebookId, phoneNumbersJson, emailAddressesJson, name, personId, joinedTime FROM person WHERE personId=?'
	return _selectPerson(sql, personId, callback)
}

function getPersonAndPasswordHash(personId, callback) {
	var sql = 'SELECT facebookId, passwordHash, phoneNumbersJson, emailAddressesJson, name, personId, joinedTime FROM person WHERE personId=?'
	return _selectPerson(sql, personId, function(err, person) {
		if (err) { return callback(err) }
		var passwordHash = remove(person, 'passwordHash')
		callback(null, person, passwordHash)
	})
}

function _selectPerson(sql, personId, callback) {
	db.people(personId).selectOne(sql, [personId], function(err, person) {
		if (err || !person) { return callback(err) }
		person.phoneNumbers = jsonList(remove(person, 'phoneNumbersJson'))
		person.emailAddresses = jsonList(remove(person, 'emailAddressesJson'))
		callback(null, person)
	})
}
