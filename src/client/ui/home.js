var conversation = require('./conversation')

function getConversationId(conv) {
	var conversationId = (conv.id || conv)
	return 'home-conversation-'+conversationId
}

var conversationsList

module.exports = {
	render:function() {
		return div('homeView',
			div('conversations', div('info', 'Loading...'), function($conversations) {
				gState.load('conversations', function(conversations) {
					// setTimeout(function() { selectConversation(conversations[0]) }) // AUTOS
					$conversations.empty().append(
						div('info'),
						conversationsList = list({
							items:filterConversations(conversations),
							onSelect:selectConversation,
							getItemId:getConversationId,
							renderItem:renderConversation,
							renderEmpty:function() {
								return div('ghostTown', "Make some friends on Facebook, then come back to Dogo")
							}
						})
					)
					reloadConversations()
				})
			})
		)
	}
}

var renderConversation = function(conversation) {
	var person = conversation.person
	var lastReceived = conversation.lastReceivedMessage
	var lastRead = conversation.lastReadMessage
	var hasUnread = lastReceived && (!lastRead || lastReceived.sentTime > lastRead.sentTime)
	return div('conversation',
		div('unreadDot' + (hasUnread ? ' hasUnread' : '')),
		face.large(person),
		div('name', person.fullName),
		div('clear')
		// div('body', (!conversation.body && !message.pictureId)
		// 	? div('youStarted', "You started the conversation.")
		// 	: (message.pictureId ? div('youStarted', 'sent you a picture') : message.body)
		// )
	)
}

function conversationFromPush(pushMessage) {
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

function filterConversations(conversations) {
	return _.filter(conversations, function(conv) { return !!conv.lastMessage })
}

function reloadConversations() {
	api.get('conversations', function getConversations(err, res) {
		if (err) { return error(err) }
		gState.set('conversations', res.conversations)
		var displayConversations = filterConversations(res.conversations)
		conversationsList.append(displayConversations)
	})
}

function selectConversation(conversation) {
	gScroller.push({ conversation:conversation })
}

function markRead(conversationId) {
	conversationsList.find('#'+getConversationId(conversationId)+' .unreadDot').removeClass('hasUnread')
}

events.on('push.message', function(pushMessage) {
	// if (!conversationsList) { return }
	// if (!conversationsList.find('#'+getConversationId(conversationId))) {
	// 	return alert("TODO add conversation to home conversation list from push")
	// }
	// markRead(pushMessage.conversationId)
	// conversationsList.prepend({ id:pushMessage.conversationId }) // put the conversation at the top of the conversations list
})

events.on('app.willEnterForeground', function() {
	if (!conversationsList) { return }
	reloadConversations()
})

events.on('message.sent', function onMessageSentHome(res, conversation) {
	conversationsList.prepend(conversation, { updateItems:true })
})

events.on('conversation.rendered', function(conversation) {
	markRead(conversation)
})
