var conversation = require('./conversation')

var $ui

module.exports = {
	render:function() {
		var section = function(className, headerLabel, content) {
			return div('section clear',
				headerLabel && div('header',
					div('label', headerLabel)
				),
				div('section '+className,
					content
				)
			)
		}
		
		$ui = {}
		
		var conversations = gState.cache['home-conversations'] || []
		
		// setTimeout(function() { selectConversation(conversations[0]) }) // AUTOS
		
		return div('home',
			div('conversations',
				$ui.info = $(div('info', 
					conversations.length == 0 && div('loading', 'Loading...')
				)),
				$ui.conversations = list({
					items:conversations,
					onSelect:selectConversation,
					getItemId:function conversationId(conv) { return 'home-convo-'+conv.conversationId },
					reAddItems:true,
					renderItem:renderConversation
				})
			),
			function() {
				reloadConversations()
			}
		)
	}
}

function renderConversation(conversation) {
	$ui.info.empty()
	var person = conversation.person
	return div('conversation clear hasUnread',
		div('unreadDot'),
		face.large(person),
		div('name', person.fullName),
		div('body', (!message.body && !message.pictureId)
			? div('youStarted', "You started the conversation.")
			: (message.pictureId ? div('youStarted', 'sent you a picture') : message.body)
		)
	)
}

function messageFromConvo(convo) {
	var hasUnread = (!convo.lastReadMessageId && convo.lastReceivedMessageId)
					|| (convo.lastReadMessageId < convo.lastReceivedMessageId)
	return {
		accountId: convo.withAccountId,
		hasUnread: hasUnread,
		body: convo.lastReceivedBody,
		lastReceivedMessageId: convo.lastReceivedMessageId,
		pictureId: convo.lastReceivedPictureId,
		conversationId: convo.id
	}
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
	return _.filter(conversations, function(conv) { return !!conv.lastMessage })
}

function reloadConversations() {
	loading(true)
	api.get('conversations', function getConversations(err, res) {
		loading(false)
		if (err) { return error(err) }
		gState.set('conversations', res.conversations)
		var displayConversations = filterConversations(res.conversations)
		$ui.conversations.append(displayConversations)
		if (displayConversations.length == 0) {
			$ui.info.empty().append(div('ghostTown', "Send a message to a friend", div('icon arrow')))
		}
	})
}

function selectConversation(message) {
	var accountId = message.accountId
	var account = accountKnown(accountId) && loadAccountId(accountId)
	var title = (account ? account.name : 'Friend')
	var conversation = { accountId:accountId }
	gScroller.push({ title:title, conversation:conversation })
	markRead(accountId)
}

function selectContact(contact) {
	var conversation = { accountId:contact.accountId, facebookId:contact.facebookId }
	gScroller.push({ title:contact.name, conversation:conversation })
	markRead(contact.accountId)
}

function bubbleId(withAccountId) { return 'conversation-bubble-'+withAccountId }

function markRead(accountId) {
	$ui.conversations.find('#'+bubbleId(accountId)).removeClass('hasUnread')
}

events.on('push.message', function(pushMessage) {
	if (!$ui) { return }
	$ui.conversations.prepend(messageFromPush(pushMessage))
})

events.on('app.willEnterForeground', function() {
	if (!$ui) { return }
	reloadConversations()
})

events.on('message.sent', function onMessageSentHome(info) {
	var message = info.message
	var toAccountId = info.toAccountId
	$ui.conversations.prepend(messageFromSentMessage(message, toAccountId))
})

events.on('conversation.rendered', function(info) {
	markRead(info.accountId)
})
