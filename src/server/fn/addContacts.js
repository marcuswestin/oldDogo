module.exports = function addContacts(personId, contactsList, callback) {
	if (!contactsList) { return callback() }
	asyncEach(contactsList, {
		parallel:1,
		finish:callback,
		iterate:function(contact, next) {
			var sql = 'INSERT INTO contact SET personId=?, contactUid=?, addressType=?, addressId=?, createdTime=?, name=?'
			db.person(personId).insertIgnoreId(sql, [personId, contact[0], contact[1], contact[2], contact[3], contact[4]], next)
		}
	})
}