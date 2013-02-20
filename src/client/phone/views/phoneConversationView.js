module.exports = {
	renderHead:renderHead,
	renderBody:renderBody,
	renderFoot:renderFoot
}

/* Head, body, foot
 ******************/
function renderHead(view) {
	return appHead(
		div(style(), 'left', button(function() { gScroller.pop() })),
		div(style(unitPadding(1)), view.conversation.people[0].name),
		div(style(), 'right', button(function() { console.log("Right") }))
	)
}

var list
function renderBody(view) {
	Conversations.readMessages(view.conversation, _addMessages)
	Conversations.fetchMessages(view.conversation, _addMessages)
	function _addMessages(err, messages) {
		if (err) { return error(err) }
		list.append(messages)
	}
	
	return div(style({ paddingTop:unit*8 }),
		list = makeList({
			selectItem:_selectMessage,
			renderItem:_renderMessage,
			getItemId: _getMessageId,
			renderEmpty:markFirstCall(_renderEmpty)
		})
	)
	
	function _renderEmpty(firstCall) {
		return div('info', style({ paddingTop:19.5*unit }), firstCall ? 'Fetching messages...' : 'Start the conversation!')
	}
}

function renderFoot(view) {
	
}

/* Messages
 **********/

function _getMessageId(message) {
	return message.fromPersonId + '-' + message.clientUid
}

function _selectMessage(message) {
	console.log('Select', message)
}

function _renderMessage(message) {
	return div(style(unitMargin(0, unit, unit), radius(2), { background:'#fff' }))
}
