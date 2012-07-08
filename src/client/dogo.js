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

// setTimeout(function() {
// 	gScroller.$head.hide()
// 	var drawer = require('./ui/drawer')
// 
// 	// var fake = { url:'http://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Dogo_Hot_Spring5%28Matsuyama_City%29.JPG/800px-Dogo_Hot_Spring5%28Matsuyama_City%29.JPG', w:800, h:600 }
// 	// var fake = { w:640, h:480, url:'http://2.bp.blogspot.com/_YGZsB8JQLfQ/S9BqXfYSzPI/AAAAAAAAAsc/MObWJOghDlk/s1600/Argentine_Dogo_puppy.jpg' }
// 	// var fake = { w:259, h:194, url:'https://encrypted-tbn3.google.com/images?q=tbn:ANd9GcTYALbWFAHdAbZOQifkFJDsbvHi_neQuh7Zrxbq3uE35uF0UrdUlA' }
// 	// var fake = { w:1585, h:980, url:'http://www.free-pet-wallpapers.com/free-pet-wallpapers/free-pet-desktop-backgrounds/109844941.jpg'}
// 	// var fake = { w:800, h:1132, url:'http://ourworldofdogs.com/wp-content/uploads/2012/02/dogo_argentino_2.jpg' }
// 	var fake = { w:335, h:870, url:'http://xboxoz360.files.wordpress.com/2008/06/rez-side-banner.jpg' }
// 	$('body > .app').append(QWEdrawer=drawer.render({ onSend:null, onHide:null, img:{style:{background:'url('+fake.url+')'}}, message:{ pictureWidth:fake.w, pictureHeight:fake.h } }))
// 	
// 	$('.controls-pos').remove()
// }, 400)
