var conversation = require('./conversation')

var $ui

module.exports = {
	render:function($body) {
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
		
		var faceColumns = 6
		var showingFaces = faceColumns * 2
		var hackI = 0
		
		$body.append(div('home',
			$ui.info = $(div('info')),
			div('conversations',
				$ui.conversations = list([], selectMessage, function(conv) { return conv.conversationId }, renderBubble)
			),
			div(style({ height:4 })),
			section('friends', 'Friends', 
				list(gState.cache['contactsByFacebookId'], selectContact, function(contact) {
					// if (contact.memberSince) {
						return div('contact', face.facebook(contact, true, hackI++ > showingFaces))
					// }
				})
			)
		))
		
		setTimeout(function() {
			var $friends = $body.find('.friends')
			var $scrollView = $(document).find('.scroller-view')
			var headHeight = 53
			var sectionTitleHeight = 42
			var viewHeight = viewport.height() - sectionTitleHeight
			$scrollView.on('scroll', function() {
				var showRows = Math.floor((viewHeight - $friends.position().top) / headHeight) + 2
				var $faces = $friends.find('.face')
				while (showingFaces < faceColumns * showRows) {
					showingFaces++
					if (!$faces[showingFaces]) { return }
					$faces[showingFaces].style.background = face.background($faces[showingFaces].getAttribute('facebookId'))
				}
			})
		})
		
		reloadConversations()
	}
}

function renderBubble(message) {
	$ui.info.find('.ghostTown').remove()
	return div('clear messageBubble text', { id:bubbleId(message.accountId) }, function($bubble) {
		if (!accountKnown(message.accountId)) {
			$bubble.append(div('loading', 'Loading...'))
		}
		loadAccountId(message.accountId, function doRenderBubble(account) {
			$bubble.empty().append(
				div('unreadDot'),
				face.facebook(account),
				div('name', account.name),
				div('body', (!message.body && !message.payloadType)
					? div('youStarted', "You started the conversation.")
					: (message.payloadType == 'picture')
					? div('youStarted', 'sent you a picture')
					: message.body
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
		payloadType: convo.lastReceivedPayloadType,
		payloadId: convo.lastReceivedPayloadId,
		conversationId: convo.id
	}
}

function messageFromPush(pushMessage) {
	var currentConvo = scroller.current().conversation
	var isCurrent = (currentConvo && (currentConvo.accountId == pushMessage.senderAccountId)) // TODO also check facebookId
	return {
		accountId: pushMessage.senderAccountId,
		hasUnread: !isCurrent,
		body: pushMessage.body,
		lastReceivedMessageId: pushMessage.id,
		payloadType: pushMessage.payloadType,
		payloadId: pushMessage.payloadId,
		conversationId: pushMessage.conversationId
	}
}

function messageFromSentMessage(message, accountId) {
	return {
		accountId: accountId,
		hasUnread: false,
		body: null, payloadType: null, payloadId:null, // So that it will still show the most recent received message
		lastReceivedMessageId: null,
		conversationId: message.conversationId
	}
}

function reloadConversations() {
	loading($ui.info)
	api.get('conversations', function(err, res) {
		loading($ui.info, false)
		if (err) { return error(err, $ui.info) }
		var messages = map(res.conversations, messageFromConvo)
		$ui.conversations.append(messages)
		if (res.conversations.length == 0) {
			$ui.info.empty().append(div('ghostTown', "Start a conversation with a friend below"))
		}
	})
}

function selectMessage(message) {
	var accountId = message.accountId
	var account = accountKnown(accountId) && loadAccountId(accountId)
	var title = (account ? account.name : 'Friend')
	var conversation = { accountId:accountId }
	scroller.push({ title:title, conversation:conversation })
	$ui.conversations.find('#'+bubbleId(accountId)).removeClass('hasUnread')
}

function selectContact(contact) {
	var conversation = { accountId:contact.accountId, facebookId:contact.facebookId }
	scroller.push({ conversation:conversation, title: contact.name })
	$ui.conversations.find('#'+bubbleId(contact.accountId)).removeClass('hasUnread')
}

function bubbleId(withAccountId) { return 'conversation-bubble-'+withAccountId }

events.on('push.message', function(pushMessage) {
	if ($ui) {
		$ui.conversations.prepend(messageFromPush(pushMessage))
	}
})

events.on('app.willEnterForeground', function() {
	if ($ui) {
		reloadConversations()
	}
})

events.on('message.sent', function onMessageSentHome(message, toAccountId, toFacebookId) {
	if (!$ui.conversations.find('#'+bubbleId(toAccountId))[0]) {
		$ui.conversations.prepend(messageFromSentMessage(message, toAccountId))
	}
})
