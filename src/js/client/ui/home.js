var conversation = require('./conversation')
var conversations = require('../conversations')
var time = require('std/time')
var hsvToRgb = require('client/colors/hsvToRgb')
var payloads = require('data/payloads')
var pictures = require('client/ui/pictures')
var sum = require('std/sum')
var rand = require('std/rand')
var flatten = require('std/flatten')

function getConversationId(conv) {
	var conversationId = (conv.conversationId || conv)
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

var summaryMessageHeights = {
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

var colorSeries = (function(){
	var colors = [
		[255,0,147],[255,106,218],[200,132,213],
		[151,108,221],[88,88,197],[71,125,197],
		[0,141,216],[0,169,237],[0,200,232],
		[61,222,224],[0,205,150],[0,195,47],
		[54,206,18],[120,203,0],[189,238,0],
		[233,239,0],null,null,
		[255,162,0],[255,124,0],[219,84,0],
		[205,35,0],null, null
	]
	var colorIndex = rand(0, colors.length)
	return function() {
		var color
		while (!color) {
			colorIndex = (colorIndex + 1) % colors.length
			color = colors[colorIndex]
		}
		return color
	}
}())

function getCollageBackground(width, conversation) {
	var summary = conversation.summary
	var recent = summary.recent || []
	var pictures = summary.pictures || []
	var collageHeight = !recent.length ? 148 : 94 + sum(recent, function getMessageHeight(message) {
		return summaryMessageHeights[message.type]
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
	
	var picUrls = map(pictures, function(summaryPic) {
		return payloads.url(summaryPic.conversationId, summaryPic.payload.secret, 'picture')
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
			return div(style({ position:'absolute', left:rect[0], top:rect[1], width:rect[2], height:rect[3], background:rgbaString(colorSeries(), 1), zIndex:1 }), style(translate(0,0)))
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
	var recent = conversation.summary.recent || []
	return div('card',
		// div('gradient'),
		getCollageBackground(310, conversation),
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
			renderName(summary.people[0]),
			map(recent, function(message) {
				return div('lastMessage',
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
