module.exports = {
	orderPersonIds:orderPersonIds,
	orderConversationIds:orderConversationIds
}

function orderPersonIds(id1, id2) {
	if (typeof id1 == 'string') { id1 = parseInt(id1, 10) }
	if (typeof id2 == 'string') { id2 = parseInt(id2, 10) }
	if ((typeof id1 != 'number') || (typeof id2 != 'number')) { return null }
	return id1 < id2
		? [id1, id2]
		: [id2, id1]
}

function orderConversationIds(id1, id2) {
	if (typeof id1 == 'string') { id1 = parseInt(id1, 10) }
	if (typeof id2 == 'string') { id2 = parseInt(id2, 10) }
	if ((typeof id1 != 'number') || (typeof id2 != 'number')) { throw new Error('Bad id') }
	return id1 < id2
		? { person1Id:id1, person2Id:id2 }
		: { person1Id:id2, person2Id:id1 }
}