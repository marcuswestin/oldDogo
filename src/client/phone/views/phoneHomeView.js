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

SQL.query = function(sql, args, callback) {
	if (arguments.length == 2) {
		callback = args
		args = null
	}
	bridge.command('BTSql.query', { sql:sql, arguments:args }, function(err, res) {
		callback(err, err ? null : res.rows)
	})
}

var cardList
function renderBody() {
	Conversations.read(function(err, conversations) {
		if (err) { return error(err) }
		cardList.append(conversations)
		Conversations.fetch(function(err, conversations) {
			if (err) { return error(err) }
			cardList.append(conversations)
			_renderNewPeople()
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
		div('clear'),
		div({ id:'newPeople' }, style({ minHeight:1 }))
	)
	
	function _renderEmpty(firstCall) {
		return div('info', style({ marginTop:19.5*unit }), firstCall ? "Fetching conversations..." : "Add your friends with the button above")
	}
	
	function _renderNewPeople() {
		var prefix = 'SELECT * FROM contact WHERE conversationId IS NULL '
		var postfix = client.isChrome ? ' LIMIT 15' : ' ORDER BY RANDOM() LIMIT 15' // Not allowed to use RANDOM() in websql. Sigh.
		SQL.query(prefix + 'AND hasLocalImage=1' + postfix, function(err, withLocalImage) {
			if (err) { return error(err) }
			SQL.query(prefix + 'AND addressType=?' + postfix, [Addresses.types.facebook], function(err, fbContacts) {
				if (err) { return error(err) }
				var newPeopleList = makeList({
					items:(withLocalImage || []).concat(fbContacts || []),
					getItemId:function(contact) { return contact.contactUid },
					renderItem:function(contact) {
						return div(style(floatLeft, { margin:px(1, 0, 0, 1) }), face(contact, { size:63 }))
					},
					selectItem:function(contact) {
						gScroller.push({ view:'conversation', contact:contact })
					}
				})
				$('#newPeople').empty().append(div(newPeopleList, div('clear', style({ height:1 }))))
			})
		})
	}
}

function renderFoot() {}

function notMe(people) {
	return filter(people, function(person) { return !Addresses.equal(sessionInfo.person, person) })
}

/* Cards
 *******/
function _renderCard(convo) {
	var people = convo.people
	each(people, function(person) { if (!person.addressType) debugger })
	return div(style(unitPadding(1/2), { background:'white', borderBottom:'1px solid #ccc' }),
		people.length == 2 ? _renderPersonCard(convo, people) : _renderGroupCard(convo, people),
		div('clear')
	)
	function _renderPersonCard(convo, people) {
		var person = notMe(people)[0]
		var lastIndex = Addresses.equal(people[0], person) ? 0 : 1// start with as if last message came from other person, as her/his photo is already showing
		return div(
			face(person, { size:unit*7 }, floatLeft, unitMargin(0, 1/2, 1/2, 0)),
			div(style(unitPadding(0, 1)),
				div(style(unitPadding(0, 0, 1/2), { fontWeight:600 }), person.name)
			),
			div(convo.recent.length == 0
				? div(style({ color:'#666' }), 'Start the conversation')
				: map(convo.recent, function(message) {
					var isNewPerson = (message.personIndex != lastIndex)
					lastIndex = message.personIndex
					return div(
						isNewPerson && face(convo.people[message.personIndex], { size:25 }, { display:'inline-block' }, floatLeft),
						_renderContent(message),
						div('clear')
					)
				})
			)
		)
		
		function _renderContent(message) {
			if (Messages.isAudio(message)) {
				var url = Payloads.url(message)
				return div(null, round(payload.duration, 1), 's', audio({ src:url, controls:true }))
			} else if (Messages.isText(message)) {
				return div(style({ maxHeight:unit*4, overflow:'hidden' }), DogoText.getHtml(message.payload.body))
			} else if (Messages.isPicture(message)) {
				var size = [200, unit*4]
				var url = BT.url('BTImage.fetchImage', { url:Payloads.url(message), cache:true, crop:[200, unit*4] })
				return div(style(graphics.backgroundImage(url, size[0], size[1], { background:'#eee' })))
			}
		}
	}
	function _renderGroupCard(convo, people) {
		var otherPeople = notMe(people)
		return div(
			map(otherPeople, function(person) { return face(person, { size:unit*7 }, floatLeft) }),
			map(otherPeople, function(person) { return person.name }).join(', ')
		)
	}
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
