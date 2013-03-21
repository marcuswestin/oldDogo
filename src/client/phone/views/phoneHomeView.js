var permissionButtons = require('./phoneHomePermissionButtons')
var composeOverlay = require('./phoneComposeOverlay')
var columnList = require('tags/columnList')

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
	Conversations.read(function(err, localConvs) {
		if (err) { return error(err) }
		// cardList.append(conversations)
		Conversations.fetch(function(err, serverConvs) {
			if (err) { return error(err) }
			var cardList = columnList({
				items:localConvs.concat(serverConvs),
				selectItem:_selectCard,
				getItemId:_getCardId,
				renderItem:_renderCard,
				renderEmpty:markFirstCall(_renderEmpty),
				toggleActive:function(el, active) { el.style.borderTop = active ? '1px solid transparent' : 'none' },
				columnCount:2,
				columnGap:unit/2,
				width:viewport.width()-unit
			})
			$('#cardList').append(cardList)
			_renderNewPeople()
		})
	})

	var drewLoading = false
	return div(style({ paddingTop:unit*8 }),
		div(permissionButtons),
		div({ id:'cardList' }, style(unitMargin(0,1/2))),
		div({ id:'newPeople' }, style({ minHeight:1, marginTop:unit }))
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
						gScroller.push({ view:'conversation', contacts:[sessionInfo.person, contact] })
					}
				})
				$('#newPeople').empty().append(div(newPeopleList, div('clear', style({ height:1 }))))
			})
		})
	}
}

function renderFoot() {}

notMe = function(people) {
	return filter(people, function(person) { return !Addresses.equal(sessionInfo.person, person) })
}

/* Cards
 *******/
var faceInsetShadow = 'inset 0 0 0 1px rgba(255,255,255,.75)'
function _renderCard(convo) {
	var people = convo.people
	var cardWidth = (viewport.width() - unit*1.5)/2
	var contentWidth = cardWidth - unit
	
	return div(style({ marginBottom:unit/2 }),
		div('card', style(unitPadding(1/2), { background:'#fff', boxShadow:cardShadow }),
			(people.length == 2
				? _renderPersonCard(convo, people)
				: _renderGroupCard(convo, people)
			)
		)
	)
	function _renderPersonCard(convo, people) {
		var person = notMe(people)[0]
		var lastIndex = Addresses.equal(people[0], person) ? 0 : 1// start with as if last message came from other person, as her/his photo is already showing
		
		var title
		if (Addresses.isDogo(person)) {
			title = div('ellipsis', person.name)
		} else if (person.name) {
			var addressDisplay = (Addresses.isFacebook(person) ? 'Facebook' : person.addressId)
			title = [div('ellipsis', person.name), div('ellipsis', style({ fontSize:12 }), addressDisplay)]
		} else {
			title = div('ellipsis', person.addressId)
		}
		
		return div(style({ color:'#222' }),
			Addresses.hasImage(person) && face(person, { width:contentWidth, height:round(contentWidth*0.85) }, unitMargin(0, 1/2, 1/2, 0), { boxShadow:faceInsetShadow }),
			div(style({ fontSize:17, whiteSpace:'nowrap' }, unitPadding(0,0,1/2,0)),
				title
			),
			div(convo.recent.length == 0
				? div('info', 'Start the conversation')
				: [
					_renderContent(convo.recent[0], true),
					map(convo.pictures, function(message) {
						var size = [contentWidth, unit*10]
						var url = BT.url('BTImage.fetchImage', { url:Payloads.url(message), cache:true, resize:[size[0] * resolution, size[1] * resolution] })
						return div(style(graphics.backgroundImage()))
					})
				]
			)
		)
		
		function _renderContent(message, showFace) {
			if (Messages.isAudio(message)) {
				var url = Payloads.url(message)
				return div(null, round(payload.duration, 1), 's', audio({ src:url, controls:true }))
			} else if (Messages.isText(message)) {
				return div(style({ maxHeight:unit*8 }),
					showFace && face(convo.people[message.personIndex], { size:18 }, floatLeft, { margin:px(2,3,0,0) }),
					html(DogoText.getHtml(message.payload.body))
				)
			} else if (Messages.isPicture(message)) {
				var size = [contentWidth, unit*10]
				var url = BT.url('BTImage.fetchImage', { url:Payloads.url(message), cache:true, resize:[size[0] * resolution, size[1] * resolution] })
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
