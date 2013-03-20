module.exports = getPerson
getPerson.andPasswordHash = getPersonAndPasswordHash

function getPerson(personId, callback) {
	var sql = 'SELECT name, personId, personId as addressId, 1 as addressType, joinedTime FROM person WHERE personId=?'
	db.person(personId).selectOne(sql, [personId], callback)
}

function getPersonAndPasswordHash(personId, callback) {
	var sql = 'SELECT passwordHash, name, personId, personId as addressId, 1 as addressType, joinedTime FROM person WHERE personId=?'
	db.person(personId).selectOne(sql, [personId], function(err, person) {
		if (err || !person) { return callback(err) }
		var passwordHash = remove(person, 'passwordHash')
		callback(null, person, passwordHash)
	})
}
