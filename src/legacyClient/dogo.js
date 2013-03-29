require('./globals')

image.base += 'mobileApp/'

var connect = require('client/ui/connect/connect')
var appScroller = require('client/ui/appScroller')
var browserModeSetup = require('client/browser/setup')

events.on('app.start', function onAppStart(appInfo) {
	// var lightFontWeight = tags.isTouch ? 400 : 100
	// var css = 'html, button, input, select, textarea, #viewport { font-weight:'+lightFontWeight+' }'
	// var style = document.createElement('style')
	// style.type = 'text/css'
	// if (style.styleSheet) { style.styleSheet.cssText = css }
	// else { style.appendChild(document.createTextNode(css)) }
	// document.getElementsByTagName('head')[0].appendChild(style)
	
	api.setHeaders({ 'x-dogo-mode':gConfig.mode, 'x-dogo-client':appInfo.client })
	startApp(info)
	
	if (gIsDev) {
		var eventName = tags.isTouch ? 'touchstart' : 'click'
		$('body').on(eventName, '.head .title', function() {
			bridge.command('app.restart')
		})
	}
})

events.on('app.didBecomeActive', function onAppDidBecomeActive() {
	bridge.command('app.setIconBadgeNumber', { number:0 })
})

events.on('BTNotifications.notification', function onPushNotification(info) {
	var data = push.decode(info.data)
	if (!data) {
		// could not decode...
		return
	}
	
	if (data.message) {
		var message = data.message
		if (info.didBringAppIntoForeground) {
			loadConversation(message.personId, function(convo) {
				var view = { conversation:convo }
				gScroller.set({ view:view, index:1, render:true, animate:false })
				events.fire('push.message', payload, info)
			})
		} else {
			events.fire('push.message', data, info)
			bridge.command('device.vibrate')
		}
	}
})

events.on('app.error', function(info) {
	if (info.message.match(/Message: SYNTAX_ERR: DOM Exception 12/)) { return } // jquery on startup
	api.post('api/log/app/error', info, function(){})
})

function startApp(info) {
	gIsDev = info.config.serverHost != 'dogo.co'
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
				// window.onerror = function windowOnError(e) { alert('ERROR ' + e) }
				console.log = function bridgeConsoleLog() {
					try { bridge.command('console.log', JSON.stringify(slice(arguments))) }
					catch(e) { bridge.command('console.log', "Error stringifying arguments") }
				}
			}
		} else {
			// window.onerror = function windowOnError(e) { console.log("ERROR", e) }
		}
		
		viewport.fit($('#viewport'))
		
		if (gIsPhantom) {
			// api.refresh('fa48a930-5e94-4f18-b180-998728a5fe85', startLoggedInApp)
			bridge.command('app.show', { fade:0 })
		} else if (gState.getSessionInfo('person')) {
			bridge.command('app.show', { fade:.95 })
			startLoggedInApp(gState.getSessionInfo())
		} else {
			$('#appContainer').append(connect.render())
			setTimeout(function() {
				bridge.command('app.show')
			}, 250)
		}
		
		if (gIsPhantom) {
			var readyEvent = document.createEvent('Events')
			readyEvent.initEvent('PhantomStartTest')
			document.dispatchEvent(readyEvent)
		}
	})
}

events.on('user.session', function(sessionInfo) {
	gState.set('sessionInfo', sessionInfo)
	connect.slideOut()
	startLoggedInApp(sessionInfo)
})

function startLoggedInApp(sessionInfo) {
	gConfigure(sessionInfo.config)
	appScroller.createAndRender()
}

if (gIsPhantom) { delete localStorage['dogo-browser-state'] }
if (gIsPhantom || !tags.isTouch) { browserModeSetup.setup() }

bridge.init()
