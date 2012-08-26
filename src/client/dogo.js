require('./globals')

var time = require('std/time')
var pictures = require('../data/pictures')

error = function error(err) {
	var message = api.error(err)
	if (!error.$tag) {
		error.$tag = $(div('errorNotice',
			div('content red',
				div('close icon', button(function() { error.hide() })),
				div('message')
			)
		)).appendTo('.scroller-body').css({
			position:'absolute', top:0, left:0,
			'-webkit-transform': 'translateY(-150px)'
		})
	}
	setTimeout(function() {
		error.$tag.css({
			'-webkit-transition': '-webkit-transform .6s',
			'-webkit-transform':'translateY(0)'
		}).find('.message').text(message)
	})
	error.hide = function() {
		error.$tag.css({ '-webkit-transform':'translateY(-150px)' })
	}
}
error.hide = function() {}

var connect = require('./ui/connect')
var appScroller = require('./ui/appScroller')
var browserModeSetup = require('./browser/setup')

appInfo = {}

events.on('app.start', function onAppStart(info) {
	appInfo = info
	api.setHeaders({ 'x-dogo-mode':appInfo.config.mode, 'x-dogo-client':appInfo.client })
	startApp()
	
	if (appInfo.config.mode == 'dev') {
		$('body').on('touchstart', '.head .title', function() {
			bridge.command('app.restart')
		})
	}
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
	if (data.toDogoId != gState.myAccount().accountId) {
		// This can happen if a single device has been used to register multiple dogo accounts
		return
	}
	
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
	
	data.wasPushed = true
	if (info.didBringAppIntoForeground) {
		loadAccountId(data.senderAccountId, function(account) {
			var conversation = { accountId:account.accountId }
			var view = { title:account.name, conversation:conversation }
			gScroller.set({ view:view, index:1, render:true, animate:false })
			events.fire('push.message', data, info)
		})
	} else {
		events.fire('push.message', data, info)
		bridge.command('device.vibrate')
	}
})

bridge.eventHandler = function bridgeEventHandler(name, info) { events.fire(name, info) }

function startApp() {
	gState.load(function onStateLoaded(err) {
		if (err) { alert("Uh oh. It looks like you need to re-install Dogo. I'm sorry! :-/") }
		
		if (appInfo.config.mode == 'dev') {
			if (isPhantom) {
				// do nothing
			} else if (tags.isTouch) {
				window.onerror = function windowOnError(e) { alert('ERROR ' + e) }
				console.log = function bridgeConsoleLog() {
					bridge.command('console.log', JSON.stringify(slice(arguments)))
				}
			}
			pictures.bucket = 'dogo-dev-conv'
		} else {
			window.onerror = function windowOnError(e) { console.log("ERROR", e) }
			pictures.bucket = 'dogo-prod-conv'
		}
		
		viewport.fit($('#viewport'))
		
		if (isPhantom) {
			api.refresh('fa48a930-5e94-4f18-b180-998728a5fe85', onConnected)
		} else if (gState.authToken()) {
			onConnected()
		} else {
			$('#viewport').append(
				connect.render(function() {
					onConnected()
					connect.slideOut()
				})
			)
		}
		
		function onConnected() {
			appScroller.createAndRender()
			buildContactsIndex()
		}
		
		bridge.command('app.show')
		if (isPhantom) {
			var readyEvent = document.createEvent('Events')
			readyEvent.initEvent('PhantomStartTest')
			document.dispatchEvent(readyEvent)
		}
	})
}

function buildContactsIndex() {
	if (buildContactsIndex.built) { return }
	buildContactsIndex.built = true
	var facebookIdToNames = {}
	each(gState.cache['contactsByFacebookId'], function(contact, facebookId) {
		var names = contact.name.split(' ')
		facebookIdToNames[facebookId] = names
	})
	bridge.command('index.build', { name:'facebookIdByName', payloadToStrings:facebookIdToNames })
}

isPhantom = navigator.userAgent.match(/PhantomJS/)
if (isPhantom) {
	delete localStorage['dogo-browser-state']
}
if (isPhantom || !tags.isTouch) {
	browserModeSetup.setup()
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
