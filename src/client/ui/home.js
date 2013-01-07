var conversation = require('./conversation')
var conversations = require('../conversations')
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
		var drewLoading = false
		setTimeout(function() {
			conversations.load(function(conversations) {
				conversationsList.append(getInitialConversations(conversations))
			})
		})
		setTimeout(reloadConversations)
		return div('homeView',
			div('logoName', icon('logoName-header', 70, 30, 10,0,6,0)),
			div('conversations', conversationsList = list({
				onSelect:selectConversation,
				getItemId:getConversationId,
				renderItem:renderCard,
				renderEmpty:function() {
					if (drewLoading) {
						return div('ghostTown', "Make some friends on Facebook, then come back to Dogo")
					} else {
						drewLoading = true
						return div('ghostTown', "Fetching friends...")
					}
				}
			}))
		)
	},
	reload:function() {
		reloadConversations()
	}
}

// var faces = {}
// function getFace(conversation) {
// 	return faces[conversation.id] = faces[conversation.id] || $(face(conversation.person, 68).__render()).addClass('large')
// }

var unreadDots = {}
function getUnreadDot(conversation) {
	return unreadDots[conversation.id] = unreadDots[conversation.id] || div('unreadDot', icon('icon-unreadDot', 14, 14)).__render()
}

function renderCard(conversation) {
	
	return div('card',
		conversation.lastMessage && conversation.lastMessage.pictureSecret && function() {
			var size = [308, 200]
			var url = pictures.displayUrl(conversation.lastMessage, { crop:[size[0]*2, size[1]*2] })
			var ratio = window.devicePixelRatio || 1
			return style({
				background:'url('+url+') transparent no-repeat',
				height:size[1], backgroundSize:px(size)
			})
		},
		div('person',
			face(conversation.person, 68)
		),
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
		
		function renderName(person) {
			return div('name', function() {
				var names = person.fullName.split(' ')
				return [div('first', names.shift()), div('rest', names.pop())]
			})
		}
		
		if (lastMessage) {
			return [
			div('right',
				div('time', function() {
					var id = tags.id()
					setTimeout(function() {
						time.ago.brief(lastMessage.sentTime * time.seconds, function(timeStr) {
							$('#'+id).text(timeStr)
						})
					})
					return { id:id }
				}),
				hasUnread && getUnreadDot(conversation)
			),
			renderName(person),
			div('lastMessage', lastMessage.body
				? div('body', gRenderMessageBubble(lastMessage, conversation, { dynamics:false, face:true, arrow:true }))
				: null // background image has already rendered over entire conversationc card
			)]
		} else {
			return [
				renderName(person),
				div('info', 'Start the conversation')
			]
		}
	}
}

function getInitialConversations(conversations) {
	var notStarted = []
	var started = []
	var family = []
	var myLastName = gState.myAccount().lastName
	
	each(conversations, function(conv) {
		if (conv.lastMessage) {
			started.push(conv)
		} else if (conv.person.fullName.split(' ').pop() == myLastName) {
			family.push(conv)
		} else {
			notStarted.push(conv)
		}
	})
	
	var minFillNum = clip(notStarted.length, 0, 3)
	var fillWithNum = clip(20 - started.length, minFillNum, notStarted.length)
	var i = Math.floor(Math.random() * notStarted.length) // start at random pos
	while (fillWithNum > 0) {
		if (family.length) {
			started.push(family.pop())
		} else {
			started.push(notStarted[i])
			i = (i + 1) % notStarted.length
		}
		fillWithNum--
	}
	return started
}

function reloadConversations() {
	conversations.refresh(function(err, conversations) {
		if (err) { return error(err) }
		if (conversationsList.isEmpty()) {
			// first time load
			var displayConversations = getInitialConversations(conversations)
		} else {
			var displayConversations = filter(conversations, function(convo) {
				if (!convo.lastMessage) { return false }
				var currentKnownConvo = conversationsList._getItem(conversationsList.getItemId(convo))
				var lastKnownMessage = currentKnownConvo && currentKnownConvo.lastMessage
				if (lastKnownMessage && lastKnownMessage.id == convo.lastMessage.id) { return false }
				return true
			})
		}
		conversationsList.prepend(displayConversations, { updateItems:true })
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
