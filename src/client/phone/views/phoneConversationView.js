var tools = require('./phoneConversationTools')
var composeOverlay = require('./phoneComposeOverlay')

module.exports = {
	renderHead:renderHead,
	renderBody:renderBody,
	renderFoot:renderFoot
}

/* Head, body, foot
 ******************/
function renderHead(view) {
	// setTimeout(function() { tools.selectText(view.conversation) }, 250) // AUTOS
	// setTimeout(function() { tools.selectMicrophone(conversation) }, 250) // AUTOS
	
	return appHead(
		div(style(unitPadding(3/4,1)), graphic('leftArrow', 20, 20), button(function() { gScroller.pop() })),
		div(style(unitPadding(1), { color:'#fff', fontSize:19, marginTop:unit/4, textShadow:'0 1px 0 rgba(0,0,0,.3)' }), view.conversation.people[0].name),
		composeOverlay.headIcon()
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
		div(style({ height:unit*6.5 }))
	)
	
	function _renderEmpty(firstCall) {
		return div('info', style({ paddingTop:19.5*unit }), firstCall ? 'Fetching messages...' : 'Start the conversation!')
	}
}

function renderFoot(view) {
	var toolStyle = { display:'inline-block', margin:px(unit/4) }
	return div({ id:'conversationFoot' },
		style({
			margin:px(0, 1/2*unit), width:viewport.width()-unit, height:footHeight, background:'#fff',
			boxShadow:'0 -1px 2px rgba(0,0,0,.55), -1px 0 1px rgba(0,0,0,.55), 1px 0 1px rgba(0,0,0,.55)'
		}),
		div(
			div(style(toolStyle), graphic('pen', 40, 40), button(function() { tools.selectText(conversation) })),
			div(style(toolStyle), graphic('pen', 40, 40), button(function() { tools.selectCamera(conversation) })),
			div(style(toolStyle), graphic('pen', 40, 40), button(function() { tools.selectMicrophone(conversation) }))
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
	var person = (isMe ? sessionInfo.person : conversation.people[0])
	return (isNewPerson
		? [div(style(unitMargin(1,1,0), unitPadding(1,1,0), { minHeight:unit*6, background:'#f3f3f3' }),
			div(style(floatRight, { fontSize:12, marginRight:unit/2, color:'#fff', textShadow:'0 -1px 0 rgba(0,0,0,.25)' }),
				time.ago.brief(message.sentTime * time.seconds)
			),
			face(person, { size:unit*5 }, floatLeft, unitMargin(0,1/2,0,0)),
			div(style(),
				person.name
			),
			div(style(unitMargin(1/4,0,0,0), unitPadding(0,0,1/2)),
				html(DogoText.getHtml(message.payload.body))
			)
		)
		]
		: div(style(unitMargin(0, 1), unitPadding(0,0,1/2,1), { background:'#f3f3f3' }),
			html(DogoText.getHtml(message.payload.body))
		)
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
