module.exports = function getConversations(req, callback) {
	var personId = req.session.personId
	var selectParticipationsSql = [
		'SELECT participationId, conversationId, lastMessageTime, lastReceivedTime, lastReadTime, peopleJson, recentJson, picturesJson ',
		'FROM participation WHERE personId=? ORDER BY lastMessageTime DESC, conversationId DESC'
	].join('\n')
	db.people(personId).select(selectParticipationsSql, [personId], function(err, participations) {
		if (err) { return callback(err) }
		each(participations, function(partic) {
			partic.people = jsonList(remove(partic, 'peopleJson'))
			partic.recent = jsonList(remove(partic, 'recentJson'))
			partic.pictures = jsonList(remove(partic, 'picturesJson'))
		})
		callback(null, participations)
	})
}
