var permissionButtons = require('./phoneHomePermissionButtons')
var composeOverlay = require('./phoneComposeOverlay')

module.exports = {
	renderHead:renderHead,
	renderBody:renderBody,
	renderFoot:renderFoot
}

/* Head, body & foot
 *******************/
var backgroundShowing = false
function renderHead() {
	// after(0, function() { composeOverlay.show() }) // AUTOS
	return appHead(
		div(style(fullHeight, fullWidth), div(style({ display:'block' }, unitPadding(1, 1.5)), graphic('234-cloud', 26, 17)), button(toggleBackground)),
		graphic('headLogoName', 80, 40),
		composeOverlay.headIcon()
	)
	
	function toggleBackground() {
		var duration = 300
		if (backgroundShowing) {
			$('#appForeground').css(translate.x(0))
			after(duration, function() {
				$('#appBackground').empty()
			})
		} else {
			var showing = unit*7
			var offset = viewport.width() - showing
			$('#appForeground').css(translate.x(offset, duration))
			$('#appBackground').empty().append(
				div(style({ width:viewport.width(), height:viewport.height() }),
					div(style(absolute(offset, 0), { zIndex:2, width:showing, height:viewport.height() }), button(toggleBackground)),
					div(style({ textAlign:'center' }),
						div('button', 'Reset', button(clearState), style({ display:'inline-block', width:120 }, unitPadding(1,1.5), translate.y(200)))
					)
				)
			)
		}
		backgroundShowing = !backgroundShowing
	}
}

var cardList
function renderBody() {
	Conversations.read(function(err, conversations) {
		if (err) { return error(err) }
		cardList.append(conversations.slice(0, 10))
		Conversations.fetch(function(err, conversations) {
			if (err) { return error(err) }
			cardList.append(conversations.slice(0, 10))
		})
	})

	var drewLoading = false
	return div(style({ paddingTop:unit*8 }),
		div(permissionButtons),
		cardList = makeList({
			selectItem:_selectCard,
			getItemId:_getCardId,
			renderItem:_renderCard,
			renderEmpty:markFirstCall(_renderEmpty)
		}),
		div(style({ height:1 }))
	)
	
	function _renderEmpty(firstCall) {
		return div('info', style({ marginTop:19.5*unit }), firstCall ? "Fetching conversations..." : "Add your friends with the button above")
	}
}

function renderFoot() {}

function notMe(people) {
	var myAddress = sessionInfo.myAddress()
	return filter(people, function(person) { return !Addresses.equal(myAddress, person) })
}

/* Cards
 *******/
function _renderCard(convo) {
	var person = notMe(convo.people)[0]
	return div(style(unitPadding(1/2), { background:'white', borderBottom:'1px solid #ccc' }),
		face(person, { size:unit*7 }, floatLeft),
		div(style(floatLeft, unitPadding(0, 1)),
			div(style(unitPadding(0, 0, 1/2), { fontWeight:600 }), person.name.split(' ')[0]),
			div(style({ color:'#666' }), 'Start the conversation')
		),
		div('clear')
	)
}

function _selectCard(convo) {
	gScroller.push({ view:'conversation', conversation:convo })
}

function _getCardId(convo) {
	return 'homeCard'+convo.participationId
}

/* Events
 ********/
events.on('conversations.new', function(info) {
	if (!cardList) { return }
	cardList.append(info.newConversations.slice(0, 10))
})
