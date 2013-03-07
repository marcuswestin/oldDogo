var log = makeLog('getContacts')

module.exports = function getContacts(req, callback) {
	var params = getUrlParams(req, 'createdSince') // for logging
	var personId = req.session.personId
	var readTime = now()
	var createdSince = params.createdSince || 0
	log('Get contacts created since', createdSince)
	db.people(personId).select('SELECT name, addressType, addressId, createdTime FROM contact WHERE personId=? AND createdTime>?', [personId, createdSince], function(err, contacts) {
		if (err) { return callback(err) }
		log('Got', contacts.length, 'contacts')
		callback(null, { contacts:contacts, readTime:readTime })
	})
}
