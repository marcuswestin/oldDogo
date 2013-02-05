require('./globals')

image.base += 'mobileApp/'

var time = require('std/time')
var payloads = require('data/payloads')
var push = require('data/push')

error = function error(err) {
	var margin = 0
	var cornerSize = 40
	var message = api.error(err)
	if (!error.$tag) {
		error.$tag = $(div({ id:'errorNotice' },
			style({ position:'absolute', top:20+margin, left:cornerSize+margin, width:viewport.width() - cornerSize*2 - margin*4 }),
			div('content',
				style({ maxHeight:240 }, scrollable.y),
				div('close', style({ 'float':'right' }), icon('icon-circlex', 22, 23), button(function() { error.hide() })),
				div('message')
			)
		)).appendTo('.tags-scroller-body')
	}
	setTimeout(function() {
		error.$tag
			.css({ visibility:'hidden' })
			.find('.message').text(message)
		setTimeout(function() {
			error.$tag
				.css(translate.y(-(error.$tag.height() + 30), 0))
				.css({ visibility:'visible' })
			setTimeout(function() {
				error.$tag.css(translate.y(0, 400))
			})
		})
	})
	error.hide = function() {
		error.$tag.css(translate.y(-(error.$tag.height() + 30)))
	}
}
error.hide = function() {}
error.handler = function(err, res) {
	if (err) { error(err) }
}

var connect = require('client/ui/connect/connect')
var appScroller = require('client/ui/appScroller')
var browserModeSetup = require('client/browser/setup')

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
	api.post('api/pushAuth', { token:info.deviceToken, type:'ios' })
})

events.on('app.didBecomeActive', function onAppDidBecomeActive() {
	bridge.command('app.setIconBadgeNumber', { number:0 })
})

events.on('push.notification', function onPushNotification(info) {
	var data = push.decode(info.data)
	if (!data) {
		// could not decode...
		return
	}
	if (data.toPersonId && data.toPersonId != gState.me().personId) {
		// This can happen if a single device has been used to register multiple people
		return
	}
	
	if (data.truncated) {
		// It will have to be fetched from the server
		return
	}
	
	if (data.message) {
		var message = data.message
		loadPersonById(message.fromPersonId, function(person) {
			if (info.didBringAppIntoForeground) {
				loadConversation(message.fromPersonId, function(convo) {
					var view = { conversation:convo }
					gScroller.set({ view:view, index:1, render:true, animate:false })
					events.fire('push.message', payload, info)
				})
			} else {
				events.fire('push.message', data, info)
				bridge.command('device.vibrate')
			}
		})
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
			bridge.command('app.show', { fade:.95 })
			onConnected()
		} else {
			$('#appContainer').append(
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
			payloads.bucket = gState.cache['sessionInfo'].picturesBucket
			migrateNewClientUidBlock()
			appScroller.createAndRender()
		}
		
		if (gIsPhantom) {
			var readyEvent = document.createEvent('Events')
			readyEvent.initEvent('PhantomStartTest')
			document.dispatchEvent(readyEvent)
		}
	})
}

if (gIsPhantom) { delete localStorage['dogo-browser-state'] }
if (gIsPhantom || !tags.isTouch) { browserModeSetup.setup() }

bridge.init()
