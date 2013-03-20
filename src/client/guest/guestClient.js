require('client/misc/clientGlobals')
var renderMessage = require('client/renderMessage')
var phoneConversationTools = require('client/phone/views/phoneConversationTools')

graphics.base += 'guest/'
keyboardHeight = 0

$('body').css({ backgroundImage:'url('+graphics.url('background', 100, 100)+')', backgroundSize:'50px 50px' })

$('#viewport').css({ margin:'0 auto', background:'#fff', overflow:'hidden' })
viewport.react(function(size) {
	$('#viewport').css({ width:size.width, height:size.height + 60 })
})

events.on('app.start', startGuestClient)
bridge.init()
webEngine.start()

function startGuestClient() {
	var parts = parseUrl(location).pathname.split('/').slice(2) // /c/65538/1/gKHZy0G6cix9
	init(parseInt(parts[0]), parseInt(parts[1]), parts[2], function(err) {
		if (err) { return error(err) }
	})
}

function init(conversationId, guestIndex, secret, callback) {
	var list = makeList({
		renderItem: _renderMessage,
		renderEmpty:function() { return div(style({ textAlign:'center', paddingTop:unit*4 }), 'Loading...') }
	})

	var headBg = gradient.radial('50% -250px', 'rgba(144, 199, 232, 0.75)', '#007BC2', '450px')
	var head = div(style(unitPadding(1/2, 1), { background:headBg, textAlign:'center', color:'#fff' }),
		div(graphic('headLogoName', 80, 40))
	)
	
	function renderHead() {
		return null
	}
	
	function renderBody() {
		return div(
			head,
			list,
			div(style({ height:unit*10 })) // foot padding
		)
	}
	
	function renderFoot() {
		return phoneConversationTools.renderFoot({ conversation:{ conversationId:conversationId } }, { text:true, microphone:true, height:40 })
	}
	
	$('#viewport').empty().append(
		div({ id:'centerFrame' }, style(absolute(0,0)), makeScroller({
			duration:300,
			renderHead:renderHead,
			renderBody:renderBody,
			renderFoot:renderFoot
		})),
		div({ id:'southFrame' }, style(absolute(0,0)))
	)
	
	viewport.react(function(size) {
		$('#centerFrame').css(size)
		$('#southFrame').css({ top:size.height, width:size.width })
	})
	
	api.post('/api/guest/session', { conversationId:conversationId, guestIndex:guestIndex, secret:secret }, function(err, res) {
		if (err) { return callback(err) }
		gConfigure(res.sessionInfo.config)
		_storePeople(res.people)
		sessionInfo.set(res.sessionInfo)
		api.get('/api/guest/messages', function(err, res) {
			if (err) { return callback(err) }
			list.append(res.messages)
		})
	})
	
	var dogoPeopleById = {}
	var guestPeopleByIndex = null
	function _storePeople(people) {
		guestPeopleByIndex = people
		each(people, function(person) {
			if (!Addresses.isDogo(person)) { return }
			dogoPeopleById[person.addressId] = person
		})
	}
	
	function _renderMessage(message) {
		var person = (message.fromPersonId ? dogoPeopleById[message.fromPersonId] : guestPeopleByIndex[message.fromGuestIndex])
		message.payload = JSON.parse(message.payloadJson)
		return renderMessage(message, person)
	}
}
