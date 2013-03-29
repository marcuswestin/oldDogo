require('client/misc/clientGlobals')
var renderMessage = require('client/renderMessage')
var phoneConversationTools = require('client/phone/views/phoneConversationTools')

graphics.base += 'guest/'
keyboardHeight = 0

function hideNavBar() { window.scrollTo(0, 1) }
hideNavBar()
after(1/10, hideNavBar)
after(1/2, hideNavBar)
after(1, hideNavBar)

appBg = graphics.backgroundImage(graphics.url('background/bright_squares'), 297, 297, { repeat:'repeat' })
$('body').css(appBg)

viewport.width = function() { return clip($(window).width(), 0, 640) }

$('#viewport').css({ margin:'0 auto', overflow:'hidden' })

events.on('app.start', startGuestClient)
bridge.init()
webEngine.start()

function startGuestClient(appInfo) {
	gConfig = appInfo.config
	var parts = parseUrl(location).pathname.split('/').slice(2) // /c/65538/1/gKHZy0G6cix9
	init(parseInt(parts[0]), parseInt(parts[1]), parts[2], function(err) {
		if (err) { return error(err) }
	})
}

function init(conversationId, personIndex, secret, callback) {
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
			div(style({ height:unit*6 })) // foot padding
		)
	}
	
	function renderFoot() {
		return phoneConversationTools.renderFoot({ conversation:{ conversationId:conversationId } }, { text:true, microphone:true, camera:true, height:40 })
	}
	
	gScroller = makeScroller({
		duration:300,
		renderHead:renderHead,
		renderBody:renderBody,
		renderFoot:renderFoot
	})
	
	$('#viewport').empty().append(
		div({ id:'centerFrame' }, style(absolute(0,0)), gScroller),
		div({ id:'southFrame' }, style(absolute(0,0)))
	)
	
	viewport.react(layout)
	function layout(size) {
		$('#viewport').css(size)
		$('#southFrame').css({ top:size.height, width:size.width })
		$('#centerFrame').css(size)
		$('#southFrame, #centerFrame').css({ left:Math.floor(($(window).width() - size.width) / 2) })
	}
	
	var people
	api.post('/api/guest/session', { conversationId:conversationId, personIndex:personIndex, secret:secret }, function(err, res) {
		if (err) { return callback(err) }
		gConfigure(res.sessionInfo.config)
		sessionInfo.set(res.sessionInfo)
		people = res.people
		api.get('/api/guest/messages', function(err, res) {
			if (err) { return callback(err) }
			each(res.messages, function(message) {
				message.payload = JSON.parse(remove(message, 'payloadJson'))
			})
			list.append(res.messages)
			layout(viewport.size())
		})
	})
	
	function scrollToBottom() {
		gScroller.getView()[0].scrollTop = 99999999
	}
	
	events.on('message.sending', function(message) {
		list.append(message)
		scrollToBottom()
	})
	
	function _renderMessage(message) {
		var person = people[message.personIndex]
		return renderMessage(message, person)
	}
}
