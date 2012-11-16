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
		div('summary',
			div('time', function($time) {
				time.ago.brief(lastMessage.sentTime * 1000, function(timeStr) {
					$time.text(timeStr)
				})
			}),
			div('name', person.fullName),
			div('lastMessage', lastMessage.body
				? div('body', lastMessage.body)
				: div('picture', function() {
					var url = pictures.urlFromMessage(lastMessage, pictures.pixels.thumb)
					var size = 46
					var ratio = window.devicePixelRatio || 1
					var backgroundUrl = BT.url('BTImage', 'fetchImage', { url:url, cache:'yes', square:size * ratio, mimeType:'image/jpg' })
					return style({
						background:'url('+backgroundUrl+') transparent no-repeat',
						width:size, height:size, backgroundSize:size+'px '+size+'px'
					})
				})
			)
		),
		div('highlights')
	)
}

gRenderConversation = function(conversation) {
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
