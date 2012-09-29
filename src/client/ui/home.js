var conversation = require('./conversation')
function getConversationId(conversation) {
	var getConversationId = (conversation.id || conversation)
	return 'home-conversation-'+getConversationId
}

var conversationsList

module.exports = {
	render:function() {
		// setTimeout(function() { selectConversation(conversations[0]) }) // AUTOS
		
		return div('home',
			div('conversations', div('info', 'Loading...'), function($conversations) {
				gState.load('conversations', function(conversations) {
					$conversations.empty().append(
						div('info'),
						conversationsList = list({
							items:conversations,
							onSelect:selectConversation,
							getItemId:getConversationId,
							reAddItems:true,
							renderItem:renderConversation
						})
					)
					reloadConversations()
				})
			})
		)
	}
}

renderConversation = function(conversation) {
	var person = conversation.person
	var lastReceived = conversation.lastReceivedMessage
	var lastRead = conversation.lastReadMessage
	var hasUnread = lastReceived && (!lastRead || lastReceived.sentTime > lastRead.sentTime)
	return div('conversation clear' + (hasUnread ? ' ' + hasUnread : ''),
		div('unreadDot'),
		face.large(person),
		div('name', person.fullName)
		// div('body', (!conversation.body && !message.pictureId)
		// 	? div('youStarted', "You started the conversation.")
		// 	: (message.pictureId ? div('youStarted', 'sent you a picture') : message.body)
		// )
	)
}

function messageFromPush(pushMessage) {
	var currentConvo = gScroller.current().conversation
	var isCurrent = (currentConvo && (currentConvo.accountId == pushMessage.senderAccountId)) // TODO also check facebookId
	return {
		accountId: pushMessage.senderAccountId,
		hasUnread: !isCurrent,
		body: pushMessage.body,
		lastReceivedMessageId: pushMessage.id,
		pictureId: pushMessage.pictureId,
		conversationId: pushMessage.conversationId
	}
}

function messageFromSentMessage(message, accountId) {
	return {
		accountId: accountId,
		hasUnread: false,
		body: null, pictureId: null, // So that it will still show the most recent received message
		lastReceivedMessageId: null,
		conversationId: message.conversationId
	}
}

function filterConversations(conversations) {
	return conversations
	return _.filter(conversations, function(conv) { return !!conv.lastMessage })
}

function reloadConversations() {
	api.get('conversations', function getConversations(err, res) {
		if (err) { return error(err) }
		gState.set('conversations', res.conversations)
		var displayConversations = filterConversations(res.conversations)
		conversationsList.append(displayConversations)
		if (displayConversations.length == 0) {
			$('.conversations .info').empty().append(
				div('ghostTown', "Make some friends on Facebook, then come back to Dogo")
			)
		}
	})
}

function selectConversation(conversation) {
	gScroller.push({ conversation:conversation })
}

function bubbleId(withAccountId) { return 'conversation-bubble-'+withAccountId }

function markRead(conversationId) {
	conversationsList.find('#'+getConversationId(conversationId)).removeClass('hasUnread')
}

events.on('push.message', function(pushMessage) {
	return alert("FIX HOME push.message event")
	// if (!$ui) { return }
	// $ui.conversations.prepend(messageFromPush(pushMessage))
})

events.on('app.willEnterForeground', function() {
	if (!conversationsList) { return }
	reloadConversations()
})

events.on('message.sent', function onMessageSentHome(info) {
	return alert('FIX HOME message.sent event')
	// var message = info.message
	// var toAccountId = info.toAccountId
	// $ui.conversations.prepend(messageFromSentMessage(message, toAccountId))
})

events.on('conversation.rendered', function(info) {
	markRead(info.conversation)
})
