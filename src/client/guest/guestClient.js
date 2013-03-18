require('client/misc/clientGlobals')
var renderMessage = require('client/renderMessage')
var phoneConversationTools = require('client/phone/views/phoneConversationTools')

graphics.base += 'guest/'
keyboardHeight = 0

$('#viewport').css({ maxWidth:600, margin:'0 auto', overflow:'hidden', background:'#fff' })
viewport.width = function() { return $('#viewport').width() }

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
	var headBg = gradient.radial('50% -180px', 'rgba(144, 199, 232, 0.75)', '#007BC2', '300px')
	$('#viewport').empty().append(
		div(style(unitPadding(1/2, 1), { background:headBg, textAlign:'center', color:'#fff', fontSize:24 }),
			div(graphic('headLogoName', 80, 40))
		),
		list,
		div({ id:'southFrame' }, style({ position:'fixed', bottom:0, width:viewport.width(), height:80 })),
		div(style({ position:'fixed', bottom:0, left:0, width:'100%', zIndex:2, }),
			div(style({ width:viewport.width(), margin:'0 auto' }),
				phoneConversationTools.renderFoot({ conversation:{ conversationId:conversationId } }, { text:true })
			)
		)
	)
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
