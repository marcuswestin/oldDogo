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
	
	return div(style({ paddingTop:unit*9.5 }),
		list = makeList({
			selectItem:_selectMessage,
			renderItem:_renderMessage,
			getItemId: _getMessageId,
			renderEmpty:markFirstCall(_renderEmpty)
		}),
		div(style({ height:unit*5.5 }))
	)
	
	function _renderEmpty(firstCall) {
		return div('info', style({ paddingTop:19.5*unit }), firstCall ? 'Fetching messages...' : 'Start the conversation!')
	}
}

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

var lastPersonId
events.on('view.changing', function() { lastPersonId = null })
function _renderMessage(message) {
	var isNewPerson = (lastPersonId != message.fromPersonId)
	lastPersonId = message.fromPersonId
	var isMe = (message.fromPersonId == sessionInfo.person.personId)
	var person = (isMe ? sessionInfo.person : view.conversation.people[0])
	return div(style(unitMargin(0, 1, 1), radius(2), unitPadding(1/2), { background:'#ccc' }),
		isNewPerson && div(style({ height:unit*6 }),
			face(person, { size:unit*5 }, floatLeft),
			div(style({ height:unit*5 }, unitMargin(0,4,0,1/2), floatLeft),
				person.name
			),
			div(style(floatRight, { fontSize:12, marginRight:unit/2, color:'#fff', textShadow:'0 -1px 0 rgba(0,0,0,.25)' }), time.ago.brief(message.sentTime * time.seconds))
		),
		message.payload.body
	)
}

/* Events
 ********/
events.on('app.start', function() {
	footHeight = unit*5.5
})

events.on('message.sending', function(message) {
	list.append(message)
})
