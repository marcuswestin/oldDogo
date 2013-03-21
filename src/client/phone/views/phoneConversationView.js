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

	var people = (view.conversation ? view.conversation.people : view.contacts)
	
	var title
	if (people.length == 2) {
		var person = notMe(people)[0]
		var personFace = Addresses.hasImage(person) && face(person, { size:unit*4.5 }, floatLeft)
		if (Addresses.isDogo(person)) {
			title = div('ellipsis', style(unitPadding(1, 0), { fontSize:19 }), person.name)
		} else if (person.name) {
			var addressDisplay = (Addresses.isFacebook(person) ? 'Facebook' : person.addressId)
			title = div('ellipsis', style({ fontSize:19 }), person.name, div('ellipsis', style({ fontSize:14 }), addressDisplay))
		} else {
			title = div('ellipsis', style({ fontSize:19 }, unitPadding(1, 0)), person.addressId)
		}
	} else {
		title = div(map(notMe(people), function(person) {
			return face(person, { size:unit*4.5 })
		}))
	}

	return appHead(
		div(personFace
			? personFace
			: [style(unitPadding(3/4,1)), graphic('leftArrow', 20, 20)]
			, button(function() { gScroller.pop() })
		),
		div(style({ margin:unit/4+'px auto', color:'#fff', textShadow:'0 1px 0 rgba(0,0,0,.3)', maxWidth:224 }), title),
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
			gScroller.getView()[0].scrollTop = list.height()
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
	return message.personIndex + ':' + message.clientUid
}

function _selectMessage(message) {
	console.log('Select', message)
}

function _renderMessage(message) {
	return renderMessage(message, view.conversation.people[message.personIndex])
}

/* Events
 ********/
events.on('message.sending', function renderSendingMessage(message) {
	var viewEl = gScroller.getView()[0]
	var heightBeforeAppend = list.height()
	var viewBottom = viewEl.scrollTop + viewEl.offsetHeight
	var diff = heightBeforeAppend - viewBottom
	var doScroll = diff < 30
	list.append(message)
	if (doScroll) {
		viewEl.scrollTop += (list.height() - heightBeforeAppend)
	}
})

events.on('push.message', function(message, info) {
	if (!view) { return }
	if (message.conversationId != view.conversation.conversationId) { return }
	if (!message.payload) { return fetchMessages() } // payload did not fit
	list.append(message)
})
