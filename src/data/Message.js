module.exports = {
	fromRow: fromRow
}

function fromRow(row) {
	return create(messageBase, row)
}

var messageBase = {
	id: null,
	highlight: null,
	from_address_id: null,
	from_account_id: null,
	highlight_text: null,
	created_time: null,
	updated_time: null,
	sent_time: null
}
