var selectParticipationsSql = 'SELECT participationId, conversationId, lastMessageTime, lastReceivedTime, lastReadTime, peopleJson, recentJson, picturesJson FROM participation '

module.exports = getConversations
getConversations.getOne = getOneConversation

function getConversations(req, callback) {
	var personId = req.session.personId
	var sql = selectParticipationsSql+' WHERE personId=? ORDER BY lastMessageTime DESC, conversationId DESC'
	db.person(personId).select(sql, [personId], callback)
}

function getOneConversation(personId, conversationId, callback) {
	var sql = selectParticipationsSql+' WHERE personId=? AND conversationId=?'
	db.person(personId).selectOne(sql, [personId, conversationId], callback)
}
