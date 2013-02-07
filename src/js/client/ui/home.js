var Conversations = require('client/conversations')
var time = require('std/time')
var payloads = require('data/payloads')
var pictures = require('client/ui/pictures')
var sum = require('std/sum')
var flatten = require('std/flatten')
var colorSeries = require('client/colors').series()

function getConversationId(conv) {
	return 'home-conversation-'+(conv.participationId || conv)
}

var conversationsList

module.exports = {
	render:function() {
		var drewLoading = false
		setTimeout(function() {
			Conversations.load(function(conversations) {
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

var cardMessageHeights = {
	'picture':106,
	'audio':39,
	'text':39
}

function randomColor() {
	return "#" + Math.random().toString(16).slice(2, 8)
}

function randomDivision() {
	return ([1/4, 2/3, 1/2, 1/3])[rand(0, 3)]
}

function getCollageBackground(width, conversation) {
	var recent = conversation.recent
	var pictures = conversation.pictures
	var collageHeight = !recent.length ? 148 : 94 + sum(recent, function getMessageHeight(message) {
		return cardMessageHeights[message.type]
	})
	
	var cardRect = [0, 0, width, collageHeight]
	
	var numRects = 4
	var divisionAxis = rand(0, 1)
	var numFirstHalf = rand(1,3)
	var numSecondHalf = numRects - numFirstHalf
	
	var division = cardRect[divisionAxis] * randomDivision()

	var halves = divideRect(cardRect, divisionAxis, 2)
	var otherAxis = (divisionAxis + 1) % 2
	
	var rects = divideRect(halves[0], otherAxis, numFirstHalf).concat(divideRect(halves[1], otherAxis, numSecondHalf))
	
	var picUrls = map(pictures, function(cardPic) {
		return payloads.url(cardPic.fromPersonId, 'picture', cardPic.payload)
	})
	
	var contents = picUrls.concat(map(new Array(clip(numRects - pictures.length, 0, numRects)), function() {
		return colorSeries().join('.')
	}))
	
	// return drawRects(rects)
	return style({
		background:'url('+BT.url('BTImage', 'collage', {
			rects:map(rects, function(r) { return r.join('.') }), // x1.y1,x2.y2,x3.y3
			contents:contents, // http://example.com/image.jpg or r.g.b
			size:width+'.'+collageHeight,
			alpha:0.55
		})+')',
		backgroundSize:width+'px '+collageHeight+'px'
	})
	
	function drawRects(rects) {
		return [style({ position:'relative' }), map(rects, function(rect) {
			return div(style({ position:'absolute', left:rect[0], top:rect[1], width:rect[2], height:rect[3], background:color.rgb(colorSeries()), zIndex:1 }), style(translate(0,0)))
		})]
	}
	
	function divideRect(rect, dir, numParts) {
		if (numParts == 1) { return [rect] }
		var rects = []
		var subSize = Math.floor(rect[2 + dir] / numParts)
		for (var i=0; i<numParts; i++) {
			var newRect = slice(rect, 0, 4) // copy the rect
			newRect[dir] += subSize * i // origin
			newRect[2 + dir] = subSize // size
			if (i == numParts - 1) {
				// add remainder to last rectangle
				newRect[2 + dir] += rect[2 + dir] % numParts
			}
			rects.push(newRect)
		}
		return rects
	}
}

function renderCard(conversation) {
	var recent = conversation.recent
	return div('card',
		// div('gradient'),
		getCollageBackground(310, conversation),
		div('person',
			face(conversation.people[0], { size:80 })
		),
		// http://martin.ankerl.com/2009/12/09/how-to-create-random-colors-programmatically/
		// style({ background:'rgb('+map(color.hsvToRgb([(Math.random() + 0.618033988749895) % 1, 0.03, 0.95]), Math.round)+')' }),
		div('recent', renderRecent(conversation)),
		div('highlights')
	)
	
	function renderRecent(convo) {
		var hasUnread = convo.lastReceivedTime > convo.lastReadTime
		
		var currentConvo = gScroller.current().conversation
		if (currentConvo && currentConvo.conversationId == conversation.conversationId) {
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
			renderName(convo.people[0]),
			map(recent, function(message) {
				return div('recentMessage',
					div('body', gRenderMessageBubble(message, conversation, {
						dynamics:false,
						face:28,
						arrow:true,
						pictureSize:[203, 90],
						maxHeight:100
					}))
				)
			})
			]
		} else {
			return [
				renderName(convo.people[0]),
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
	Conversations.fetch(function(err, conversations) {
		if (err) { return error(err) }
		if (conversationsList.isEmpty()) {
			// first time load
			var displayConversations = getInitialConversations(conversations)
		} else {
			var displayConversations = filter(conversations, function(convo) {
				if (!convo.lastMessage) { return false }
				var currentKnownConvo = conversationsList._getItem(conversationsList.getItemId(convo))
				var lastKnownMessage = currentKnownConvo && currentKnownConvo.lastMessage
				if (lastKnownMessage && lastKnownMessage.messageId == convo.lastMessage.messageId) { return false }
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
	
	var convo = find(gState.cache['conversations'], function(convo) { return convo.conversationId == pushMessage.conversationId })
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
