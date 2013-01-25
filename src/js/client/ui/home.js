var conversation = require('./conversation')
var conversations = require('../conversations')
var time = require('std/time')
var hsvToRgb = require('client/colors/hsvToRgb')
var pictures = require('client/ui/pictures')

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
				// setTimeout(function() { conversations && conversations[0] && selectConversation(conversations[0]) }) // AUTOS
			})
		})
		setTimeout(reloadConversations)
		return div('homeView',
			div('logoName', icon('logoName-header', 70, 30, 12,0,4,0)),
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


function renderCard(conversation) {
	var summaryPictures = conversation.summary.pictures || []
	var recent = conversation.summary.recent || []
	return div('card',
		// div('gradient'),
		summaryPictures.length > 0 && function() {
			var size = [310, 200]
			var url = pictures.displayUrl(summaryPictures[0], { crop:[size[0]*2, size[1]*2] })
			var ratio = window.devicePixelRatio || 1
			return style({
				background:'url('+url+') #fff no-repeat',
				minHeight:size[1], backgroundSize:px(size)
			})
		},
		div('person',
			face(conversation.summary.people[0], { size:80 })
		),
		// http://martin.ankerl.com/2009/12/09/how-to-create-random-colors-programmatically/
		// style({ background:'rgb('+map(hsvToRgb([(Math.random() + 0.618033988749895) % 1, 0.03, 0.95]), Math.round)+')' }),
		div('summary', renderSummary(conversation)),
		div('highlights')
	)
	
	function renderSummary(convo) {
		var hasUnread = convo.lastReceivedTime > convo.lastReadTime
		var summary = convo.summary
		
		var currentConvo = gScroller.current().conversation
		if (currentConvo && currentConvo.id == conversation.id) {
			hasUnread = false
		}

		function renderName(person) {
			return div('name', function() {
				var names = person.name.split(' ')
				return [div('first', names.shift()), div('rest', names.pop())]
			})
		}
		
		if (recent.length) {
			return [
			div('right',
				div('time', function() {
					var id = tags.id()
					setTimeout(function() {
						time.ago.brief(convo.lastMessageTime * time.seconds, function(timeStr) {
							$('#'+id).text(timeStr)
						})
					})
					return { id:id }
				}),
				hasUnread && div('unreadDot', icon('icon-unreadDot', 14, 14))
			),
			renderName(summary.people[0]),
			map(recent, function(message) {
				return div('lastMessage',
					div('body', gRenderMessageBubble(message, conversation, { dynamics:false, face:28, arrow:true }))
				)
			})
			]
		} else {
			return [
				renderName(summary.people[0]),
				div('info', 'Start the conversation')
			]
		}
	}
}

function getInitialConversations(conversations) {
	var notStarted = []
	var started = []
	var family = []
	var myLastName = gState.me().lastName
	
	each(conversations, function(conv) {
		if (conv.lastMessageTime) {
			started.push(conv)
		} else if (find(conv.people, function(person) { return person.name.split(' ').pop() == myLastName })) {
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

events.on('push.message', function(data) {
	var pushMessage = data.message
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
