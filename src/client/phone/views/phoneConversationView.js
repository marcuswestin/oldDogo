var tools = require('./phoneConversationTools')
var composeOverlay = require('./phoneComposeOverlay')
var renderMessage = require('client/renderMessage')

module.exports = {
	renderHead:renderHead,
	renderBody:renderBody,
	renderFoot:renderFoot
}

/* Head, body, foot
 ******************/
var view
function renderHead(_view) {
	view = _view

	// setTimeout(function() { tools.selectText(view) }, 250) // AUTOS
	// setTimeout(function() { tools.selectMicrophone(view) }, 250) // AUTOS
	
	if (view.conversation) {
		var name = view.conversation.people[1].name
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
			fetchMessages()
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

function fetchMessages() {
	Conversations.fetchMessages(view.conversation, function(err, messages) {
		if (err) { return error(err) }
		list.append(messages)
	})
}

function renderFoot(view) {
	return tools.renderFoot(view, {
		text:true,
		camera:true,
		microphone:true,
		height:unit*5.5
	})
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
	return renderMessage(message, _getMessagePerson(message))
}

var peopleById
events.on('view.changing', function() { peopleById = null })
function _getMessagePerson(message) {
	if (!peopleById) {
		peopleById = {}
		each(view.conversation.people, function(person) {
			if (!Addresses.isDogo(person)) { return }
			peopleById[person.addressId] = person
		})
	}
	return peopleById[message.fromPersonId]
}

/* Events
 ********/
events.on('message.sending', function(message) {
	list.append(message)
})

events.on('push.message', function(message, info) {
	if (!view) { return }
	if (message.conversationId != view.conversation.conversationId) { return }
	if (!message.payload) { return fetchMessages() } // payload did not fit
	list.append(message)
})
