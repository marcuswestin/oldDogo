require('./globals')

image.base += 'mobileApp/'

var time = require('std/time')
var pictures = require('../data/pictures')
var push = require('../data/push')

error = function error(err) {
	var message = api.error(err)
	if (!error.$tag) {
		error.$tag = $(div('errorNotice',
			div('content',
				div('close', icon('icon-circlex', 22, 23), button(function() { error.hide() })),
				div('message')
			)
		)).appendTo('.tags-scroller-body')
			.css({ position:'absolute', top:0, left:0 })
			.css(translate.y(-150))
	}
	setTimeout(function() {
		error.$tag.css(translate.y(0, 600)).find('.message').text(message)
	})
	error.hide = function() {
		error.$tag.css(translate.y(-150))
	}
}
error.hide = function() {}
error.handler = function(err, res) {
	if (err) { error(err) }
}

var connect = require('./ui/connect')
var appScroller = require('./ui/appScroller')
var browserModeSetup = require('./browser/setup')

gAppInfo = {}

events.on('app.start', function onAppStart(info) {
	gAppInfo = info
	api.setHeaders({ 'x-dogo-mode':gAppInfo.config.mode, 'x-dogo-client':gAppInfo.client })
	startApp(info)
	
	if (gIsDev) {
		var eventName = tags.isTouch ? 'touchstart' : 'click'
		$('body').on(eventName, '.head .title', function() {
			bridge.command('app.restart')
		})
	}
})

events.on('push.registered', function onPushRegistered(info) {
	api.post('push_auth', { pushToken:info.deviceToken, pushSystem:'ios' })
})

events.on('app.didBecomeActive', function onAppDidBecomeActive() {
	bridge.command('app.setIconBadgeNumber', { number:0 })
})

events.on('push.notification', function onPushNotification(info) {
	var payload = push.decodePayload(info.data)
	if (!payload) {
		// could not decode...
		return
	}
	if (payload.toDogoId && payload.toDogoId != gState.myAccount().accountId) {
		// This can happen if a single device has been used to register multiple dogo accounts
		return
	}
	
	if (payload.truncated) {
		// It will have to be fetched from the server
		return
	}
	
	var message = payload.message
	if (message) {
		if (info.didBringAppIntoForeground) {
			loadAccountId(message.senderAccountId, function(account) {
				var conversation = { accountId:account.accountId } // hmm... this should load from gState by message.conversationId
				var view = { title:account.name, conversation:conversation } // Hmm.. This should 
				gScroller.set({ view:view, index:1, render:true, animate:false })
				events.fire('push.message', payload, info)
			})
		} else {
			events.fire('push.message', payload, info)
			bridge.command('device.vibrate')
		}
	}
})

function startApp(info) {
	gIsDev = info.config.serverHost != 'dogoapp.com'
	gState.load('sessionInfo', function onStateLoaded(sessionInfo) {
		gState.load('isDevInfo2', function onModeLoaded(isDevInfo) {
			if (!isDevInfo || isDevInfo.isDev == null) {
				gState.set('isDevInfo2', { isDev:gIsDev })
			} else if (isDevInfo.isDev != gIsDev) {
				gState.clear()
			}
		})
		
		if (gIsDev) {
			if (gIsPhantom) {
				// do nothing
			} else if (tags.isTouch) {
				window.onerror = function windowOnError(e) { alert('ERROR ' + e) }
				console.log = function bridgeConsoleLog() {
					bridge.command('console.log', JSON.stringify(slice(arguments)))
				}
			}
		} else {
			window.onerror = function windowOnError(e) { console.log("ERROR", e) }
		}
		
		viewport.fit($('#viewport'))
		
		if (gIsPhantom) {
			// api.refresh('fa48a930-5e94-4f18-b180-998728a5fe85', onConnected)
			bridge.command('app.show', { fade:0 })
		} else if (gState.getSessionInfo('authToken')) {
			bridge.command('app.show', { fade:.75 })
			onConnected()
		} else {
			$('#viewport').append(
				connect.render(function() {
					onConnected()
					connect.slideOut()
				})
			)
			setTimeout(function() {
				bridge.command('app.show')
			}, 250)
		}
		
		function migrateNewClientUidBlock() {
			var sessionInfo = gState.cache['sessionInfo']
			if (sessionInfo.clientUidBlock) { return }
			// migrate old clients to have new block size
			var clientUidBlockSize = 100000
			sessionInfo.clientUidBlock = {
				start: clientUidBlockSize + 1,
				end: clientUidBlockSize * 2
			}
			gState.set('sessionInfo', sessionInfo)
		}
		
		function onConnected() {
			pictures.bucket = gState.cache['sessionInfo'].picturesBucket || 'dogo-prod-conv' // default to prod for old prod clients
			migrateNewClientUidBlock()
			appScroller.createAndRender()
			buildContactsIndex()
		}
		
		if (gIsPhantom) {
			var readyEvent = document.createEvent('Events')
			readyEvent.initEvent('PhantomStartTest')
			document.dispatchEvent(readyEvent)
		}
	})
}

function buildContactsIndex() {
	return
	if (buildContactsIndex.built) { return }
	buildContactsIndex.built = true
	var facebookIdToNames = {}
	each(gState.cache['contactsByFacebookId'], function(contact, facebookId) {
		var names = contact.name.split(' ')
		facebookIdToNames[facebookId] = names
	})
	bridge.command('index.build', { name:'facebookIdByName', payloadToStrings:facebookIdToNames })
}

if (gIsPhantom) { delete localStorage['dogo-browser-state'] }
if (gIsPhantom || !tags.isTouch) { browserModeSetup.setup() }

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
