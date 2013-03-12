var tools = require('./phoneConversationTools')
var composeOverlay = require('./phoneComposeOverlay')

module.exports = {
	renderHead:renderHead,
	renderBody:renderBody,
	renderFoot:renderFoot
}

/* Head, body, foot
 ******************/
var view
var peopleById
var lastPersonId
function renderHead(_view) {
	view = _view
	lastPersonId = null
	peopleById = {}

	// setTimeout(function() { tools.selectText(view) }, 250) // AUTOS
	// setTimeout(function() { tools.selectMicrophone(view) }, 250) // AUTOS
	
	if (view.conversation) {
		var name = view.conversation.people[0].name
		each(view.conversation.people, function(person) {
			peopleById[person.addressId] = person
		})
	} else {
		var name = view.contact.name || view.contact.addressId
	}
	
	return appHead(
		div(style(unitPadding(3/4,1)), graphic('leftArrow', 20, 20), button(function() { gScroller.pop() })),
		div(style(unitPadding(1), { color:'#fff', fontSize:19, marginTop:unit/4, textShadow:'0 1px 0 rgba(0,0,0,.3)' }), name),
		composeOverlay.headIcon()
	)
}

var list
function renderBody() {
	nextTick(function() {
		if (!view.conversation) { return list.empty().empty() }
		Conversations.readMessages(view.conversation, function(err, messages) {
			if (err) { return error(err) }
			list.append(messages)
			// TODO Fetch since last fetched timestamp
			Conversations.fetchMessages(view.conversation, function(err, messages) {
				if (err) { return error(err) }
				list.append(messages)
			})
		})
	})
	
	return div(style({ paddingTop:unit*7.5 }),
		list = makeList({
			selectItem:_selectMessage,
			renderItem:_renderMessage,
			getItemId: _getMessageId,
			renderEmpty:markFirstCall(_renderEmpty)
		}),
		div(style({ height:unit*6.5 }))
	)
	
	function _renderEmpty(isFirstCall) {
		return div('info', style({ paddingTop:19.5*unit }), isFirstCall ? 'Fetching messages...' : 'Start the conversation!')
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
			div(style(toolStyle), graphic('pen', 40, 40), button(function() { tools.selectText(view) })),
			div(style(toolStyle), graphic('pen', 40, 40), button(function() { tools.selectCamera(view) })),
			div(style(toolStyle), graphic('pen', 40, 40), button(function() { tools.selectMicrophone(view) }))
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

events.on('view.changing', function() { lastPersonId = null })
function _renderMessage(message) {
	var isNewPerson = (lastPersonId != message.fromPersonId)
	lastPersonId = message.fromPersonId
	var person = peopleById[message.fromPersonId]
	var bg = '#fff'
	return (isNewPerson
		? [div(style(unitMargin(1,1/2,0), unitPadding(1/2,1/2,0), { minHeight:unit*6, background:bg }),
			div(style(floatRight, { fontSize:12, marginRight:unit/2, color:'rgb(25,161,219)', textShadow:'0 -1px 0 rgba(0,0,0,.25)' }),
				time.ago.brief(message.sentTime * time.seconds)
			),
			face(person, { size:unit*5 }, floatLeft, unitMargin(0,1/2,0,0)),
			div(style(),
				person.name
			),
			div(style(unitMargin(1/4,0,0,0), unitPadding(0,0,1/2)),
				renderContent(message)
			)
		)
		]
		: div(style(unitMargin(0, 1/2), unitPadding(0,0,1/2,1/2), { background:bg }),
			renderContent(message)
		)
	)
}

function renderContent(message) {
	return html(DogoText.getHtml(message.payload.body))
}

/* Events
 ********/
events.on('app.start', function() {
	footHeight = unit*5.5
})

events.on('message.sending', function(message) {
	list.append(message)
})
