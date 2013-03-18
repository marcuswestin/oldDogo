var log = makeLog('getContacts')

module.exports = function getContacts(req, callback) {
	var params = getUrlParams(req, 'createdSince') // for logging
	var personId = req.session.personId
	var readTime = time.now()
	var createdSince = params.createdSince || 0
	log('Get contacts created since', createdSince)
	var sql = 'SELECT contactUid, addressType, addressId, name, createdTime, pictureUploadedTime FROM contact WHERE personId=? AND createdTime>?'
	db.person(personId).select(sql, [personId, createdSince], function(err, contacts) {
		if (err) { return callback(err) }
		log('Got', contacts.length, 'contacts')
		callback(null, { contacts:contacts, readTime:readTime })
	})
}
