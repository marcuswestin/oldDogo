require('client/misc/clientGlobals')

Conversations = require('client/state/Conversations')
Contacts = require('client/state/Contacts')

var connect = require('client/phone/connect/connect')
var phoneViews = {
	home: require('client/phone/views/phoneHomeView'),
	conversation: require('client/phone/views/phoneConversationView')
}

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

var clientSchema = require('client/database/clientSchema')
function startPhoneClient(appInfo) {
	gConfig = appInfo.config
	bridge.command('BTSql.openDatabase', { name:'DogoClientDb' }, function(err, res) {
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
	asyncEach(clientSchema.getTableSchemas(), {
		iterate:function(tableSchemaSql, callback) {
			bridge.command('BTSql.update', { sql:tableSchemaSql }, callback)
		},
		finish:function(err) {
			if (err) { return error(err) }
			Documents.write('DatabaseSchema', { version:clientSchema.version }, function(err, res) {
				if (err) { return error(err) }
				renderPhoneClient()
			})
		}
	})
}

function renderPhoneClient() {
	appBg = graphics.backgroundImage(graphics.url('background/fabric_plaid'), 200, 200, { repeat:'repeat' })

	$('body').css(viewport.size()).css({ overflow:'hidden' })
	$('#viewport')
		.css(viewport.size()).css({ overflow:'hidden' })
		.append(div({ id:'centerFrame' }, style(appBg, viewport.size())))
		.append(div({ id:'southFrame' }, style({ width:viewport.width(), height:0, position:'absolute', top:viewport.height() })))
	
	parallel(sessionInfo.load, loadViewStack, function(err, _, viewStack) {
		if (err) { return error('There was an error starting the app. Please re-install it. Sorry.') }

		if (sessionInfo.person) {
			renderSignedInApp(sessionInfo, viewStack)
		} else {
			$('#centerFrame').empty().append(connect.render(viewStack))
			events.on('user.session', renderSignedInApp)
		}
		bridge.command('app.show', { fade:.95 })
	})
}

saveViewStack = function(callback) {
	Documents.write('ViewStack', gScroller.stack, callback)
}
loadViewStack = function(callback) {
	Documents.read('ViewStack', callback)
}

makeScroller.onViewChanging = function onViewChanging() {
	saveViewStack()
	events.fire('view.changing')
}

function renderSignedInApp(sessionInfo, viewStack) {
	Payloads.configure(sessionInfo.config.payloads)
	gScroller = makeScroller({
		duration:300,
		renderHead:renderHead,
		renderBody:renderBody,
		renderFoot:renderFoot,
		stack:viewStack
	})
	
	$('#centerFrame').empty().append(
		div({ id:'appBackground' }, style(viewport.getSize(), absolute(0,0))),
		div({ id:'appForeground' }, style(viewport.getSize(), translate(0,0)), gScroller)
	)
}

events.on('device.rotated', function() {})

appHead = function(left, center, right) {
	var background = gradient.radial('50% -70px', 'rgba(144, 199, 232, 0.75)', '#007BC2', '300px')
	return div(style(absolute(0, 0), { textAlign:'center', width:viewport.width(), height:unit*5.5, background:background }),
		div(style(floatLeft, radius(2), { width:unit*6, height:unit*4.5, margin:unit/2 }), left),
		div(style(floatRight, radius(2), { width:unit*6, height:unit*4.5, margin:unit/2 }), right),
		div(style({ textAlign:'center' }), center)
	)
}

statusBarHeight = 20
function renderHead(view) {
	return div(style(translate(0,0), absolute(0, statusBarHeight)), getPhoneView(view).renderHead(view))
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


events.on('push.notification', function onPushNotification(info) {
	var message = Messages.decodeFromPush(info.data)
	if (!message) {
		log.error('Could not decode message from push', info)
		return
	}
	
	if (info.didBringAppIntoForeground) {
		// Set convo
	} else {
		events.fire('push.message', message, info)
		bridge.command('device.vibrate')
	}
	
	// if (data.message) {
	// 	var message = data.message
	// 	if (info.didBringAppIntoForeground) {
	// 		loadConversation(message.fromPersonId, function(convo) {
	// 			var view = { conversation:convo }
	// 			gScroller.set({ view:view, index:1, render:true, animate:false })
	// 			events.fire('push.message', payload, info)
	// 		})
	// 	} else {
	// 		events.fire('push.message', data, info)
	// 		bridge.command('device.vibrate')
	// 	}
	// }
})
