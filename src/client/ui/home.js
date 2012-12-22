var conversation = require('./conversation')
var time = require('std/time')
var hsvToRgb = require('client/colors/hsvToRgb')
var pictures = require('data/pictures')

function getConversationId(conv) {
	var conversationId = (conv.id || conv)
	return 'home-conversation-'+conversationId
}

var conversationsList

module.exports = {
	render:function() {
		return div('homeView',
			div('logoName', icon('logoName', 60, 26, 12, 0, 8, 0)),
			div('conversations', div('info', 'Loading...'), function($conversations) {
				gState.load('conversations', function(conversations) {
					// setTimeout(function() { selectConversation(conversations[0]) }) // AUTOS
					$conversations.empty().append(
						div('info'),
						conversationsList = list({
							items:filterConversations(conversations),
							onSelect:selectConversation,
							getItemId:getConversationId,
							renderItem:renderCard,
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

function renderCard(conversation) {
	var person = conversation.person
	var lastReceived = conversation.lastReceivedMessage
	var lastRead = conversation.lastReadMessage
	var lastMessage = conversation.lastMessage
	var hasUnread = lastReceived && (!lastRead || lastReceived.sentTime > lastRead.sentTime)
	return div('card',
		face.large(person),
		// http://martin.ankerl.com/2009/12/09/how-to-create-random-colors-programmatically/
		// style({ background:'rgb('+map(hsvToRgb([(Math.random() + 0.618033988749895) % 1, 0.03, 0.95]), Math.round)+')' }),
		div('summary', renderSummary(lastMessage)),
		div('highlights')
	)
	
	function renderSummary(lastMessage) {
		if (lastMessage) {
			return [div('time', function($time) {
				time.ago.brief(lastMessage.sentTime * time.seconds, function(timeStr) {
					$time.text(timeStr)
				})
			}),
			div('name', person.fullName),
			div('lastMessage', lastMessage.body
				? div('body', lastMessage.body)
				: div('picture', function() {
					var size = 46
					var url = pictures.displayUrl(lastMessage, size)
					var ratio = window.devicePixelRatio || 1
					return style({
						background:'url('+url+') transparent no-repeat',
						width:size, height:size, backgroundSize:size+'px '+size+'px'
					})
				})
			)]
		} else {
			return [
				div('name', person.fullName),
				div(style({ color:'#666', margin:px(11, 0, 0, 10), fontStyle:'italic' }), 'Start the conversation')
			]
		}
	}
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
	var notStarted = []
	var started = []
	
	each(conversations, function(conv) {
		if (conv.lastMessage) {
			started.push(conv)
		} else {
			notStarted.push(conv)
		}
	})
	
	var fillWithNum = clip(20 - started.length, 0, notStarted.length)
	var i = Math.floor(Math.random() * notStarted.length) // start at random pos
	while (fillWithNum > 0) {
		started.push(notStarted[i])
		i = (i + 1) % notStarted.length
		fillWithNum--
	}
	return started
}

function reloadConversations() {
	api.get('conversations', function getConversations(err, res) {
		if (err) { return error(err) }
		var displayConversations = filterConversations(res.conversations)
		conversationsList.append(displayConversations)
		gState.set('conversations', res.conversations)
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
