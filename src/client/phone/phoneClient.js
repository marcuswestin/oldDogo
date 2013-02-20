require('client/globals')

var connect = require('client/ui/connect/connect')
var phoneViews = {
	home: require('client/phone/views/phoneHomeView'),
	conversation: require('client/phone/views/phoneConversationView')
}

units = unit = 8
unit2 = unit*2
unit3 = unit*3
unit4 = unit*4
unit5 = unit*5

graphics.base += 'phone/'

// setTimeout(function() { toggleUnitGrid() }, 200) // AUTOS toggle unit grid

var fitInputText = require('tags/text/fitInputText')
$(document).on('input', 'input', fitInputText)
$(document).on('keypress', 'input', function($e) {
	if ($e.keyCode == 13) { $(this).blur() }
})
$(document).on('touchstart', 'input', function() {
	// $('input').blur()
	$(this).focus()
})

events.on('app.start', startPhoneClient)

bridge.init()

function startPhoneClient(appInfo) {
	gAppInfo = appInfo
	var background = radialGradient('50% -70px', '#90C7E8', '#007BC2', '300px')
	$('#viewport')
		.append(div({ id:'centerFrame' }, style(viewport.size(), { background:background })))
		.append(div({ id:'southFrame' }, style({ width:viewport.width(), height:0 })))
	
	renderPhoneClient()
}

function renderPhoneClient() {
	parallel(sessionInfo.load, curry(Documents.read, 'viewStack'), function(err, _, viewStack) {
		if (err) { return error('There was an error starting the app. Please re-install it. Sorry.') }

		if (sessionInfo.authToken) {
			events.fire('user.session', sessionInfo, viewStack)
		} else {
			$('#centerFrame').empty().append(connect.render(viewStack))
		}
		bridge.command('app.show', { fade:.95 })
	})
}

makeScroller.onViewChanging = function onViewChanging() {
	Documents.write('viewStack', gScroller.stack)
}

events.on('user.session', function renderSignedInApp(sessionInfo, viewStack) {
	gScroller = makeScroller({
		headHeight:0,
		duration:300,
		renderHead:renderHead,
		renderBody:renderBody,
		renderFoot:renderFoot,
		stack:viewStack
	})
	
	$('#centerFrame').empty().append(
		div({ id:'appBackground' }),
		div({ id:'appForeground' }, style(translate(0,0)), gScroller)
	)
})

function renderHead(view) {
	return getPhoneView(view).renderHead(view)
}

function renderBody(view) {
	return getPhoneView(view).renderBody(view)
}

function renderFoot(view) {
	return getPhoneView(view).renderFoot(view)
}

function getPhoneView(view) {
	return phoneViews[view.view] || phoneViews.home
}

;(function detectDevSwipe() {
	var doubleTapStart
	$('body').on('touchstart', function onBodyTouchStart($e) {
		if ($e.originalEvent.touches.length != 2) { return }
		doubleTapStart = tags.eventPos($e)
	})
	$('body').on('touchmove', function onBodyTouchMove($e) {
		if (!doubleTapStart) { return }
		if ((tags.eventPos($e).y - doubleTapStart.y) > 100) {
			toggleUnitGrid()
			doubleTapStart = null
		}
		if ((tags.eventPos($e).y - doubleTapStart.y) < -100) {
			clearState()
			doubleTapStart = null
		}
	})
}())
