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
			div('logoName', icon('logoName', 260, 125, 12, 0, 8, 0)),
			div('conversations', div('info', 'Loading...'), function($conversations) {
				gState.load('conversations', function(conversations) {
					// setTimeout(function() { selectConversation(conversations[0]) }) // AUTOS
					$conversations.empty().append(
						div('info'),
						conversationsList = list({
							items:getInitialConversations(conversations),
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
	},
	reload:function() {
		reloadConversations()
	}
}

var faces = {}
function getFace(conversation) {
	return faces[conversation.id] = faces[conversation.id] || $(face.large(conversation.person).__render()).addClass('large')
}

var unreadDots = {}
function getUnreadDot(conversation) {
	return unreadDots[conversation.id] = unreadDots[conversation.id] || div('unreadDot', icon('unreadDot', 14, 14)).__render()
}

function renderCard(conversation) {
	
	return div('card',
		getFace(conversation),
		// http://martin.ankerl.com/2009/12/09/how-to-create-random-colors-programmatically/
		// style({ background:'rgb('+map(hsvToRgb([(Math.random() + 0.618033988749895) % 1, 0.03, 0.95]), Math.round)+')' }),
		div('summary', renderSummary(conversation)),
		div('highlights')
	)
	
	function renderSummary(conversation) {
		var person = conversation.person
		var lastMessage = conversation.lastMessage
		var lastReceived = conversation.lastReceivedMessage
		var lastRead = conversation.lastReadMessage
		var hasUnread = (lastReceived && (!lastRead || lastReceived.sentTime > lastRead.sentTime))
		
		var currentConvo = gScroller.current().conversation
		if (currentConvo && currentConvo.id == conversation.id) {
			hasUnread = false
		}
		
		if (lastMessage) {
			return [
			div('right',
				div('time', function($time) {
					time.ago.brief(lastMessage.sentTime * time.seconds, function(timeStr) {
						$time.text(timeStr)
					})
				}),
				hasUnread && getUnreadDot(conversation)
			),
			div('name', function() {
				var names = person.fullName.split(' ')
				return [div('first', names.shift()), div('rest', names.pop())]
			}),
			div('lastMessage', lastMessage.body
				? div('body', gRenderMessageBubble(lastMessage, conversation, { dynamics:false, face:true, arrow:true }))
				: div('picture', function() {
					var size = [304, 188]
					var url = pictures.displayUrl(lastMessage, size)
					var ratio = window.devicePixelRatio || 1
					return style({
						background:'url('+url+') transparent no-repeat',
						width:size[0], height:size[1], backgroundSize:size+'px '+size+'px'
					})
				})
			)]
		} else {
			return [
				div('name', person.fullName),
				div('info', 'Start the conversation')
			]
		}
	}
}

function getInitialConversations(conversations) {
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

function reloadConversations(fillWith) {
	api.get('conversations', function getConversations(err, res) {
		if (err) { return error(err) }
		var displayConversations = filter(res.conversations, function(convo) { return !!convo.lastMessage })
		// this is arcane - we have a bunch of un-started convos and want the convos from server to appear first
		// so we prepend them to conversationsList. However, they need to appear in correct order so we reverse them.
		displayConversations.reverse()
		conversationsList.prepend(displayConversations, { updateItems:true })
		
		gState.set('conversations', res.conversations)
	})
}

function selectConversation(conversation) {
	gScroller.push({ conversation:conversation })
}

function markRead(conversationId) {
	conversationsList.find('#'+conversationsList.getItemId(conversationId)+' .unreadDot').remove()
}

events.on('push.message', function(payload) {
	var pushMessage = payload.message
	if (!conversationsList) { return }
	if (!conversationsList.find('#'+conversationsList.getItemId(pushMessage.conversationId))[0]) {
		return // TODO add conversation to home conversation list from push
	}
	
	var convo = find(gState.cache['conversations'], function(convo) { return convo.id == pushMessage.conversationId })
	convo.lastMessage = convo.lastReceivedMessage = pushMessage
	if (!pushMessage.sentTime) { pushMessage.sentTime = time.now() }
	
	conversationsList.prepend(convo, { updateItems:true }) // put the conversation at the top of the conversations list
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
