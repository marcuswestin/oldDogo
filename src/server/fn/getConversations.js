var selectParticipationsSql = 'SELECT participationId, conversationId, lastMessageTime, lastReceivedTime, lastReadTime, peopleJson, recentJson, picturesJson FROM participation '

module.exports = getConversations
getConversations.getOne = getOneConversation

function getConversations(req, callback) {
	var personId = req.session.personId
	var sql = selectParticipationsSql+' WHERE personId=? ORDER BY lastMessageTime DESC, conversationId DESC'
	db.person(personId).select(sql, [personId], function(err, participations) {
		if (err) { return callback(err) }
		each(participations, _fixParticipation)
		callback(null, participations)
	})
}

function getOneConversation(personId, conversationId, callback) {
	var sql = selectParticipationsSql+' WHERE personId=? AND conversationId=?'
	db.person(personId).selectOne(sql, [personId, conversationId], function(err, participation) {
		if (err) { return callback(err) }
		_fixParticipation(participation)
		callback(err, participation)
	})
}

function _fixParticipation(partic) {
	partic.people = jsonList(remove(partic, 'peopleJson'))
	partic.recent = jsonList(remove(partic, 'recentJson'))
	partic.pictures = jsonList(remove(partic, 'picturesJson'))
}