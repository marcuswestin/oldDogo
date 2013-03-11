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

keyboardHeight = 216

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

clientDbName = 'DogoClientDb'
var clientSchema = require('client/database/clientSchema')
function startPhoneClient(appInfo) {
	gAppInfo = appInfo
	bridge.command('BTSql.openDatabase', { name:clientDbName }, function(err, res) {
		if (err) { return error(err) }
		Documents.read('DatabaseSchema', function(err, res) {
			if (err) { return error(err) }
			if (res && res.version == 1) {
				// Schema migrations will happen here
				renderPhoneClient()
			} else {
				firstTimeSetup()
			}
		})
	})
}

function firstTimeSetup() {
	bridge.command('BTSql.update', { sql:clientSchema.getSchema() }, function(err, res) {
		if (err) { return error(err) }
		Documents.write('DatabaseSchema', { version:clientSchema.version }, function(err, res) {
			if (err) { return error(err) }
			renderPhoneClient()
		})
	})
}

function renderPhoneClient() {
	appBg = graphics.background('background', 100, 100, { repeat:'repeat', background:'#fff' })
	$('#viewport')
		.append(div({ id:'centerFrame' }, style(appBg, viewport.size())))
		.append(div({ id:'southFrame' }, style({ width:viewport.width(), height:0, position:'absolute', top:viewport.height() })))
	
	parallel(sessionInfo.load, curry(Documents.read, 'viewStack'), function(err, _, viewStack) {
		if (err) { return error('There was an error starting the app. Please re-install it. Sorry.') }

		if (sessionInfo.authToken) {
			renderSignedInApp(sessionInfo, viewStack)
		} else {
			$('#centerFrame').empty().append(connect.render(viewStack))
			events.on('user.session', renderSignedInApp)
		}
		bridge.command('app.show', { fade:.95 })
	})
}

makeScroller.onViewChanging = function onViewChanging() {
	Documents.write('viewStack', gScroller.stack)
}

function renderSignedInApp(sessionInfo, viewStack) {
	Payloads.configure(sessionInfo.config.payloads)
	gScroller = makeScroller({
		headHeight:0,
		duration:300,
		renderHead:renderHead,
		renderBody:renderBody,
		renderFoot:renderFoot,
		stack:viewStack
	})
	
	$('#centerFrame').empty().append(
		div({ id:'appBackground' }, style(absolute(0,0))),
		div({ id:'appForeground' }, style(translate(0,0)), gScroller)
	)
}

events.on('device.rotated', function() {})

appHead = function(left, center, right) {
	var background = radialGradient('50% -70px', 'rgba(144, 199, 232, 0.75)', '#007BC2', '300px')
	return div(style(absolute(0, 0), { textAlign:'center', width:viewport.width(), height:unit*5.5, background:background }),
		div(style(floatLeft, radius(2), { width:unit*6, height:unit*4.5, margin:unit/2 }), left),
		div(style(floatRight, radius(2), { width:unit*6, height:unit*4.5, margin:unit/2 }), right),
		div(style({ textAlign:'center' }), center)
	)
}

statusBarHeight = 20
function renderHead(view) {
	return div(style(absolute(0, statusBarHeight)), getPhoneView(view).renderHead(view))
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
		} else if ((tags.eventPos($e).y - doubleTapStart.y) < -100) {
			clearState()
			doubleTapStart = null
		}
	})
}())
