module.exports = function renderCard(conversation) {
	return div('card', style({ margin:spacing, background:'#fff' }),
		// div('gradient'),
		// _getCollageBackground(310, conversation),
		div('person',
			face(conversation.people[0], { size:64 })
		),
		// http://martin.ankerl.com/2009/12/09/how-to-create-random-colors-programmatically/
		// style({ background:'rgb('+map(color.hsvToRgb([(Math.random() + 0.618033988749895) % 1, 0.03, 0.95]), Math.round)+')' }),
		div('recent', renderRecent(conversation)),
		div('highlights')
	)
}

var colorSeries = require('client/colors').series()

function renderRecent(conversation) {
	var hasUnread = conversation.lastReceivedTime > conversation.lastReadTime
	var recent = conversation.recent
	
	var currentConvo = gScroller.current().conversation
	if (currentConvo && currentConvo.conversationId == conversation.conversationId) {
		hasUnread = false
	}

	function renderName(person) {
		return div('headName', function() {
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
					time.ago.brief(conversation.lastMessageTime * time.seconds, function(timeStr) {
						$('#'+id).text(timeStr)
					})
				})
				return { id:id }
			}),
			hasUnread && div('unreadDot', icon('icon-unreadDot', 14, 14))
		),
		renderName(conversation.people[0]),
		map(recent, function(message) {
			return div('recentMessage',
				div('body', gRenderMessageBubble(message, conversation, {
					dynamics:false,
					face:28,
					arrow:true,
					pictureSize:[168, 90],
					maxHeight:100
				}))
			)
		})
		]
	} else {
		return [
			renderName(conversation.people[0]),
			div('info', 'Start the conversation')
		]
	}
}

function _getCollageBackground(width, conversation) {
	var cardMessageHeights = {
		'picture':106,
		'audio':39,
		'text':39
	}
	
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

	var division = cardRect[divisionAxis] * _randomDivision()

	var halves = _divideRect(cardRect, divisionAxis, 2)
	var otherAxis = (divisionAxis + 1) % 2

	var rects = _divideRect(halves[0], otherAxis, numFirstHalf).concat(_divideRect(halves[1], otherAxis, numSecondHalf))

	var picUrls = map(pictures, function(cardPic) {
		return Payloads.url(cardPic)
	})

	var contents = picUrls.concat(map(new Array(clip(numRects - pictures.length, 0, numRects)), function() {
		return colorSeries().join(':')
	}))

	// return _drawRects(rects)
	return style({
		background:'url('+BT.url('BTImage.collage', {
			rects:map(rects, function(r) { return r.join(':') }), // x1:y1,x2.y2,x3.y3
			contents:contents, // http://example.com/image.jpg or r.g.b
			size:width+':'+collageHeight,
			alpha:.9
		})+') white',
		backgroundSize:width+'px '+collageHeight+'px'
	})
	
	function _randomDivision() {
		return ([1/4, 2/3, 1/2, 1/3])[rand(0, 3)]
	}
	
	function _drawRects(rects) {
		return [style({ position:'relative' }), map(rects, function(rect) {
			return div(style({ position:'absolute', left:rect[0], top:rect[1], width:rect[2], height:rect[3], background:colors.rgb(colorSeries()) }), style(translate(0,0)))
		})]
	}

	function _divideRect(rect, dir, numParts) {
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