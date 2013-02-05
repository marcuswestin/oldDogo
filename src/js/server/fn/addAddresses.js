module.exports = function addAddresses(req, newAddresses, callback) {
	// Should we look up addresses here?
	var personId = req.session.personId
	log.debug('add X new people for person Y', newAddresses.length, personId)
	asyncMap(newAddresses, {
		iterate:function(newAddress, next) {
			if (!newAddress.name || !newAddress.type || !newAddress.address) {
				return next({ message:'Conversation people are missing properties', newAddress:newAddress })
			}
			var people = [newAddress]
			db.people(personId).insert(
				'INSERT INTO participation SET personId=?, peopleJson=?',
				[personId, JSON.stringify(people)],
				function(err, participationId) {
					if (err) { return next(err) }
					next(null, { participationId:participationId, people:people })
				}
			)
		},
		finish:function(err, newConversations) {
			if (err) { return callback(err) }
			callback(null, { newConversations:newConversations })
		}
	})
}

