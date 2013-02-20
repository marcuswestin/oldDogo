var permissionButtons = require('./phoneHomePermissionButtons')

module.exports = {
	renderHead:renderHead,
	renderBody:renderBody,
	renderFoot:renderFoot
}

/* Head, body & foot
 *******************/
function renderHead() {
	return appHead(
		div(style(fullHeight, fullWidth, { background:'blue' })),
		graphic('headLogoName', 80, 40),
		div(style(fullHeight, fullWidth, { background:'green' }))
	)
}

var cardList
function renderBody() {
	Conversations.read(function(err, conversations) {
		if (err) { return error(err) }
		cardList.append(conversations)
		Conversations.fetch(function(err, conversations) {
			if (err) { return error(err) }
			cardList.append(conversations)
		})
	})

	var drewLoading = false
	return div(style({ paddingTop:unit*8 }),
		div(permissionButtons),
		div(style({ height:unit/2 })),
		cardList = list({
			onSelect:_selectCard,
			getItemId:_getCardId,
			renderItem:_renderCard,
			renderEmpty:function renderEmptyHome() {
				nextTick(function() { drewLoading = true })
				return div('info', style({ marginTop:19.5*unit }),
					drewLoading
						? "Add your friends with the button above"
						: "Fetching conversations..."
				)
			}
		}),
		div(style({ height:1 }))
	)
}

function renderFoot() {}

/* Cards
 *******/
function _renderCard(convo) {
	var person = convo.people[0]
	return div(style(unitMargin(0, 1, 1), unitPadding(1/2), radius(2), { background:'white' }),
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
	cardList.append(info.allConversations)
})
