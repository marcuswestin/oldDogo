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
		
		return div('home',
			div('conversations',
				$ui.info = $(div('info', 
					conversations.length == 0 && div('loading', 'Loading...')
				)),
				$ui.conversations = list({
					items:conversations,
					onSelect:selectConversation,
					getItemId:function conversationId(conv) { return 'home-convo-'+conv.conversationId },
					renderItem:renderBubble
				})
			),
			function() {
				reloadConversations()
			}
		)
	}
}

function renderBubble(message) {
	$ui.info.empty()
	return div('clear messageBubble text', { id:bubbleId(message.accountId) }, function renderBubbleContent($bubble) {
		if (!accountKnown(message.accountId)) {
			$bubble.append(div('loading', 'Loading...'))
		}
		loadAccountId(message.accountId, function doRenderBubble(account) {
			$bubble.empty().append(
				div('unreadDot'),
				face.facebook(account),
				div('name', account.name),
				div('body', (!message.body && !message.pictureId)
					? div('youStarted', "You started the conversation.")
					: (message.pictureId ? div('youStarted', 'sent you a picture') : message.body)
				)
			)
			if (message.hasUnread) { $bubble.addClass('hasUnread') }
		})
	})
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

function reloadConversations() {
	loading(true)
	api.get('conversations', function getConversations(err, res) {
		loading(false)
		if (err) { return error(err) }
		var messages = map(res.conversations, messageFromConvo)
		gState.set('home-conversations', messages)
		$ui.conversations.append(messages)
		if (res.conversations.length == 0) {
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
	$ui.conversations.find('#'+bubbleId(accountId)).removeClass('hasUnread')
}

function selectContact(contact) {
	var conversation = { accountId:contact.accountId, facebookId:contact.facebookId }
	gScroller.push({ title:contact.name, conversation:conversation })
	$ui.conversations.find('#'+bubbleId(contact.accountId)).removeClass('hasUnread')
}

function bubbleId(withAccountId) { return 'conversation-bubble-'+withAccountId }

events.on('push.message', function(pushMessage) {
	if ($ui) {
		var message = messageFromPush(pushMessage)
		$ui.conversations.find('#'+$ui.conversations.getItemId(message)).remove().prepend(message)
	}
})

events.on('app.willEnterForeground', function() {
	if ($ui) {
		reloadConversations()
	}
})

events.on('message.sent', function onMessageSentHome(info) {
	var message = info.message
	var toAccountId = info.toAccountId
	var toFacebookId = info.toFacebookId
	if (!$ui.conversations.find('#'+bubbleId(toAccountId))[0]) {
		$ui.conversations.prepend(messageFromSentMessage(message, toAccountId))
	}
})
