var tools = require('./phoneConversationTools')

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
var conversation
function renderBody(view) {
	conversation = view.conversation
	if (conversation.conversationId) {
		Conversations.readMessages(conversation, _addMessages)
		Conversations.fetchMessages(conversation, _addMessages)
		function _addMessages(err, messages) {
			if (err) { return error(err) }
			list.append(messages)
		}
	} else {
		nextTick(function() {
			list.empty().empty()
		})
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

events.on('app.start', function() {
	footHeight = unit*5.5
})

function renderFoot(view) {
	var toolStyle = { display:'inline-block', margin:px(unit/4) }
	return div(
		style({
			margin:px(0, 1/2*unit), width:viewport.width()-unit, height:footHeight, background:'#fff',
			boxShadow:'0 -1px 2px rgba(0,0,0,.55), -1px 0 1px rgba(0,0,0,.55), 1px 0 1px rgba(0,0,0,.55)'
		}),
		div(
			div(style(toolStyle), graphic('pen', 40, 40), button(function() { tools.selectText(conversation) }))
		)
	)
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
