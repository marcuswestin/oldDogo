require('client/globals')

var connect = require('client/ui/connect/connect')
var phoneViews = {
	home: require('client/phone/views/phoneHomeView')
}

units = unit = 8

// setTimeout(function() { toggleUnitGrid() }, 200) // AUTOS Toggle Unit Grid

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

function startPhoneClient() {
	var background = radialGradient('50% -70px', '#90C7E8', '#007BC2', '300px')
	$('#viewport')
		.append(div({ id:'centerFrame' }, style(viewport.size(), { background:background })))
		.append(div({ id:'southFrame' }, style({ width:viewport.width(), height:0 })))
	
	renderPhoneClient()
}

function renderPhoneClient() {
	sessionInfo.load(function(err) {
		if (err) { return error('There was an error starting the app. Please re-install it. Sorry.') }
		
		if (sessionInfo.authToken) {
			events.fire('user.session', sessionInfo)
		} else {
			// $('#centerFrame').empty().append(connect.render)
		}
		bridge.command('app.show', { fade:.95 })
	})
}

events.on('user.session', function renderSignedInApp() {
	gScroller = makeScroller({
		headHeight:0,
		onViewChanging:function onViewChanging() { events.fire('view.changing') },
		duration:300,
		renderHead:renderHead,
		renderBody:renderBody,
		renderFoot:renderFoot
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
	return phoneViews.home
}
