var pictures = require('client/ui/pictures')
var flatten = require('std/flatten')
var homePermissionButtons = require('./homePermissionButtons')
var homeCard = require('./homeCard')

function getConversationId(conv) {
	return 'home-conversation-'+(conv.participationId || conv)
}

var conversationsList

module.exports = {
	render:function renderHome() {
		var drewLoading = false
		nextTick(function() {
			Conversations.load(function(conversations) {
				conversationsList.append(getInitialConversations(conversations))
				// setTimeout(function() { conversations && conversations[0] && selectConversation(conversations[0]) }) // AUTOS
			})
			Conversations.fetch()
		})
		return div('homeView',
			div('logoName', icon('logoName-header', 70, 30, 12,0,4,0)),
			homePermissionButtons,
			div('conversations', conversationsList = list({
				onSelect:selectConversation,
				getItemId:getConversationId,
				renderItem:homeCard,
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
	reload:Conversations.fetch
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

function selectConversation(conversation) {
	gScroller.push({ conversation:conversation })
}

events.on('conversations.new', function handleNewConversations(info) {
	var conversations = info.allConversations
	if (conversationsList.isEmpty()) {
		// first time load
		var displayConversations = getInitialConversations(conversations)
	} else {
		var displayConversations = filter(conversations, function filterConvos(convo) {
			if (!convo.lastMessage) { return false }
			var currentKnownConvo = conversationsList._getItem(conversationsList.getItemId(convo))
			var lastKnownMessage = currentKnownConvo && currentKnownConvo.lastMessage
			if (lastKnownMessage && lastKnownMessage.messageId == convo.lastMessage.messageId) { return false }
			return true
		})
	}
	conversationsList.prepend(displayConversations, { updateItems:true })
})

events.on('push.message', function(data) {
	var pushMessage = data.message
	if (!conversationsList) { return }
	if (!conversationsList.find('#'+conversationsList.getItemId(pushMessage.conversationId))[0]) {
		return // TODO add conversation to home conversation list from push
	}
	
	var convo = find(gState.cache['conversations'], function(convo) { return convo.conversationId == pushMessage.conversationId })
	convo.lastMessage = convo.lastReceivedMessage = pushMessage
	if (!pushMessage.postedTime) { pushMessage.postedTime = time.now() }
	
	conversationsList.prepend(convo, { updateItems:true }) // put the conversation at the top of the conversations list
})

events.on('app.willEnterForeground', function() {
	if (!conversationsList) { return }
	Conversations.fetch()
})

events.on('message.sent', function onMessageSentHome(res, conversation) {
	conversationsList.prepend(conversation, { updateItems:true })
})

events.on('conversation.rendered', function onConversationRendered(conversation) {
	// mark read
	conversationsList.find('#'+conversationsList.getItemId(conversation)+' .unreadDot').remove()
})
