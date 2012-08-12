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
		
		var someFriends = []
		for (var id in gState.cache['contactsByFacebookId']) {
			if (someFriends.length >= 24) { break }
			var contact = gState.cache['contactsByFacebookId'][id]
			if (contact.memberSince) {
				someFriends.push(contact)
			}
		}
		for (var id in gState.cache['contactsByFacebookId']) {
			if (someFriends.length >= 24) { break }
			var contact = gState.cache['contactsByFacebookId'][id]
			if (!contact.memberSince) {
				someFriends.push(contact)
			}
		}
		
		return div('home',
			$ui.info = $(div('info')),
			div('conversations',
				$ui.conversations = list({
					items:[],
					onSelect:selectConversation,
					getItemId:conversationId,
					renderItem:renderBubble,
					reAddItems:true
				})
			),
			function() {
				reloadConversations()
			}
		)
	}
}

function conversationId(conv) { return conv.conversationId }

// function renderFaces() {
// 	setTimeout(function() {
// 		var $friends = $body.find('.friends')
// 		var $scrollView = $(document).find('.scroller-view')
// 		var headHeight = 53
// 		var sectionTitleHeight = 42
// 		var viewHeight = viewport.height() - sectionTitleHeight
// 		$scrollView.on('scroll', function() {
// 			var showRows = Math.floor((viewHeight - $friends.position().top) / headHeight) + 2
// 			var $faces = $friends.find('.face')
// 			while (showingFaces < faceColumns * showRows) {
// 				showingFaces++
// 				if (!$faces[showingFaces]) { return }
// 				$faces[showingFaces].style.background = face.background($faces[showingFaces].getAttribute('facebookId'))
// 			}
// 		})
// 	})
// 
// 	var faceColumns = 6
// 	var showingFaces = faceColumns * 2
// 	var hackI = 0
// 	
// 	return [
// 		div(style({ height:4 }))
// 		section('friends', 'Some of Your Friends',
// 			list({ items:someFriends, onSelect:selectContact, renderItem:function(contact) {
// 				return div('contact', face.facebook(contact, true, hackI++ > showingFaces))
// 			}})
// 		)
// 	]
// }

function renderBubble(message) {
	$ui.info.find('.ghostTown').remove()
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
		$ui.conversations.prepend(messageFromPush(pushMessage))
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
