module.exports = {
	orderConversationIds:orderConversationIds
}

function orderConversationIds(id1, id2) {
	if (typeof id1 == 'string') { id1 = parseInt(id1, 10) }
	if (typeof id2 == 'string') { id2 = parseInt(id2, 10) }
	if ((typeof id1 != 'number') || (typeof id2 != 'number')) { throw new Error('Bad id') }
	return id1 < id2
		? { account1Id:id1, account2Id:id2 }
		: { account1Id:id2, account2Id:id1 }
}