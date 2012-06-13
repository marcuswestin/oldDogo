require('./globals')

var time = require('std/time')

button.onError = error = function error(err, $tag) {
	var message = "Oops! "+JSON.stringify(err)
	if ($tag) {
		$tag.empty().append(div('error', message))
	} else {
		alert(message)
	}
}

var appScroller = require('./ui/appScroller')
var browserModeSetup = require('./browser/setup')

appInfo = {}

events.on('app.start', function onAppStart(info) {
	appInfo = info
	startApp()
})

events.on('push.registerFailed', function(info) {
	alert("Uh oh. Push registration failed")
})

events.on('push.registered', function onPushRegistered(info) {
	gState.set('pushToken', info.deviceToken)
	api.post('push_auth', { pushToken:info.deviceToken, pushSystem:'ios' })
})

events.on('app.didBecomeActive', function onAppDidBecomeActive() {
	bridge.command('app.setIconBadgeNumber', { number:0 })
})

events.on('push.notification', function onPushNotification(info) {
	var data = info.data
	var alert = data.aps && data.aps.alert
	if (alert) {
		var match
		if (match=alert.match(/^\w+ says: "(.*)"/i)) {
			data.body = match[1]
		} else if (alert.match(/^\w+ sent you a \w+/i)) {
			// No body for drawings/pictures/etc
		} else {
			data.body = alert
			// backcompat
		}
	}
	events.fire('push.message', data)
	bridge.command('device.vibrate')
})

bridge.eventHandler = function bridgeEventHandler(name, info) { events.fire(name, info) }

function startApp() {
	gState.load(function onStateLoaded(err) {
		if (err) { alert("Uh oh. It looks like you need to re-install Dogo. I'm sorry! :-/") }
		
		if (appInfo.config.mode == 'dev') {
			window.onerror = function windowOnError(e) { alert('ERROR ' + e) }
		} else {
			window.onerror = function windowOnError(e) { console.log("ERROR", e) }
		}
		
		appScroller.createAndRender()
		
		bridge.command('app.show')
	})
}

if (!tags.isTouch) {
	browserModeSetup.setup()
} else {
	console.log = function bridgeConsoleLog() {
		bridge.command('console.log', JSON.stringify(slice(arguments)))
	}
}

bridge.init()

