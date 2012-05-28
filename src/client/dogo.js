require('./globals')

var time = require('std/time')

button.onError = error = function(err, $tag) {
	var message = "Oops! "+JSON.stringify(err)
	if ($tag) {
		$tag.empty().append(div('error', message))
	} else {
		alert(message)
	}
}

var connect = require('./ui/connect'),
	home = require('./ui/home'),
	conversation = require('./ui/conversation')

appInfo = {}

loading = function($tag, isLoading) {
	if (!$tag) { return }
	$tag.empty()
	if (typeof isLoading == 'boolean' && !isLoading) { return }
	$tag.empty().append(div('loading', 'Loading...'))
}

getId = function(d) { return d.id }

accountKnown = function(accountId) { return !!gState.cache['contactsByAccountId'][accountId] }
loadFacebookId = function(facebookId, callback) { return loadAccount(null, facebookId, callback) }
loadFacebookId.queue = {}
loadAccountId = function(accountId, callback) { return loadAccount(accountId, null, callback) }
loadAccountId.queue = {}
loadAccount = function(accountId, facebookId, callback) {
	if (!accountId && !facebookId) { throw new Error("loadAccount: Undefined accountId") }
	if (accountId) {
		var cacheKey = 'contactsByAccountId'
		var queue = loadAccountId.queue
		var id = accountId
	} else {
		var cacheKey = 'contactsByFacebookId'
		var queue = loadFacebookId.queue
		var id = facebookId
	}
	
	var cache = gState.cache[cacheKey]
	var account = cache[id]
	if (account) {
		callback && callback(account)
		return account
	} else if (queue[id]) {
		queue[id].push(callback)
	} else {
		queue[id] = [callback]
		api.get('account_info', { accountId:accountId, facebookId:facebookId }, function(err, res) {
			if (err) { return error(err) }
			cache[id] = res.account
			gState.set(cacheKey, cache)
			each(queue[id], function(callback) { callback(res.account) })
			delete queue[id]
		})
	}
}

events.on('app.start', function(info) {
	appInfo = info
	startApp()
})

events.on('push.registerFailed', function(info) {
	alert("Uh oh. Push registration failed")
})

events.on('push.registered', function(info) {
	gState.set('pushToken', info.deviceToken)
	api.post('push_auth', { pushToken:info.deviceToken, pushSystem:'ios' })
})

events.on('app.didBecomeActive', function() {
	bridge.command('app.setIconBadgeNumber', { number:0 })
})

events.on('push.notification', function(info) {
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

bridge.eventHandler = function(name, info) { events.fire(name, info) }

scroller = null
function startApp() {
	gState.load(function(err) {
		if (err) { alert("Uh oh. It looks like you need to re-install Dogo. I'm so sorry! :()") }
		
		if (appInfo.config.mode == 'dev') {
			window.onerror = function(e) { alert('ERROR ' + e) }
		} else {
			window.onerror = function(e) { console.log("ERROR", e) }
		}
		
		scroller = tags.scroller({ onViewChange:function onViewChange() { events.fire('view.change') }, duration:400 })
		$(document.body).append(div('app', viewport.fit,

			scroller.renderHead(45, function($head, view, viewBelow, fromView) {
				console.log('renderHead start')
				var showBackButton = viewBelow && (scroller.stack.length > (scroller.hasConnectView ? 2 : 1))
				$head.append(div('head',
					showBackButton && renderBackButton(viewBelow.title || 'Home'),
					div('title', view.title || 'Dogo'),
					(appInfo.config.mode == "dev") && div('devBar',
						div('button', 'R', button(function() { bridge.command('app.restart') })),
						div('button', 'X', button(function() { gState.clear(); bridge.command('app.restart') }))
					)
				))
				function renderBackButton(title) {
					return div('button back', title, button(function() {
						scroller.pop()
					}))
				}
				console.log('renderHead done')
			}),

			scroller.renderBody(3, function($body, view) {
				console.log("render view", JSON.stringify(view))
				if (view.conversation) {
					conversation.render($body, view.conversation)
				} else if (gState.authToken()) {
					home.render($body, view)
				} else {
					scroller.hasConnectView = true
					connect.render($body, function(res, facebookSession) {
						var contacts = res.contacts
						var contactsByAccountId = gState.cache['contactsByAccountId'] || {}
						var contactsByFacebookId = gState.cache['contactsByFacebookId'] || {}
						each(contacts, function(contact) {
							if (contact.accountId) {
								contactsByAccountId[contact.accountId] = contact
							}
							contactsByFacebookId[contact.facebookId] = contact
						})
						
						gState.set('contactsByAccountId', contactsByAccountId)
						gState.set('contactsByFacebookId', contactsByFacebookId)
						gState.set('sessionInfo', { myAccount:res.account, authToken:res.authToken, facebookSession:facebookSession })
						scroller.push({ title:'Dogo' })

						bridge.command('push.register')
					})
				}
			})
		))
		
		bridge.command('app.show')
	})
}

if (!tags.isTouch) {
	// Browser for debugging
	bridge.command = function(command, data, callback) {
		if (!callback && typeof data == 'function') {
			callback = data
			data = null
		}
		console.log('fake bridge', command, data)
		switch(command) {
			case 'facebook.connect':
				FB.login(function(response) {
					callback(null, response.authResponse)
				}, data && data.opts)
				break
			case 'app.restart':
				location.reload()
				break
			case 'state.set':
				var state = _getState(); state[data.key] = data.value;
				localStorage['dogo-browser-state'] = JSON.stringify(state)
				break
			case 'state.clear':
				localStorage.clear()
				break
			case 'state.load':
				callback(null, _getState())
				break
		}
	}
	
	var _getState = function() { try { return JSON.parse(localStorage['dogo-browser-state']) } catch(e) { return {} } }
	
	$(function() {
		bridge.eventHandler('app.start', { config: { mode:'dev' }, bundleVersion:'DevChrome' })
		$('.app').css({ margin:'0 auto' })
		$('body').css({ background:'#222' })
	})
	
	$(document.body).append(div({ id:'fb-root' }))
	window.fbAsyncInit = function() {
		FB.init({
			appId      : '219049001532833', // App ID
			status     : false, // check login status
			cookie     : false, // enable cookies to allow the server to access the session
			xfbml      : false  // parse XFBML
		})
	};

	// Load the SDK Asynchronously
	(function(d){
		var js, id = 'facebook-jssdk', ref = d.getElementsByTagName('script')[0];
		if (d.getElementById(id)) {return;}
		js = d.createElement('script'); js.id = id; js.async = true;
		js.src = "//connect.facebook.net/en_US/all.js";
		ref.parentNode.insertBefore(js, ref);
	}(document));

	viewport.height = function() { return 460 }
	viewport.width = function() { return 320 }
	
	module.exports = {
		fit:fit,
		getSize:getSize,
		width:width,
		height:height
	}

	function fit() {
		var el = this
		var resize = function() {
			$(el).height(height()).width(width())
		}
		$win.resize(resize)
		resize()
	}

	function height() { return $win.height() }
	function width() { return $win.width() }
	function getSize() { return { width:width(), height:height() } }

	var $win = $(window)
	
	var $buttons = $(div())
	each([-180, -90, 0, 90, 180], function(deg) {
		$buttons.append(div(style({ padding:10, color:'#fff' }), 'Rotate: ', deg, button(function() {
			events.fire('device.rotated', { deg:deg })
		})))
	})
	$('body').append($buttons)
	
} else {
	console.log = function() {
		bridge.command('console.log', JSON.stringify(slice(arguments)))
	}
}

bridge.init()

