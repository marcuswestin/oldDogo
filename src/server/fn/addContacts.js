module.exports = function addContacts(req, callback) {
	var params = getJsonParams(req, 'contactsList')
	var personId = req.session.personId
	if (!params.contactsList) { return callback() }
	asyncEach(params.contactsList, {
		parallel:1,
		finish:callback,
		iterate:function(contact, next) {
			var sql = 'INSERT INTO contact SET personId=?, contactUid=?, addressType=?, addressId=?, createdTime=?, name=?'
			db.person(personId).insertIgnoreId(sql, [personId, contact[0], contact[1], contact[2], contact[3], contact[4]], next)
		}
	})
}