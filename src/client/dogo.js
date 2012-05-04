require('lib/jquery-1.7.2')

style = function(styles) { return { style:styles } }
create = require('std/create')
map = require('std/map')
button = require('dom/button')
api = require('./api')
bridge = require('./bridge')
face = require('ui/face')
bind = require('std/bind')
viewport = require('dom/viewport')
each = require('std/each')

require('dom/tags').expose()

error = function(err) {
	alert("Oops! "+JSON.stringify(err))
}

var makeScroller = require('dom/scroller'),
	connect = require('./ui/connect'),
	home = require('./ui/home')

config = {}
state = {
	get: function(name) {
		var val = localStorage[name]
		return val ? JSON.parse(localStorage[name]) : undefined
	},
	set: function(name, val) {
		console.log('state.set', name, val)
		localStorage[name] = JSON.stringify(val)
	},
	clear: function() {
		localStorage.clear()
	}
}

bridge.eventHandler = function(name, info) {
	switch(name) {
		case 'app.start':
			config = info
			renderApp()
			bridge.command('app.show')
			break
		case 'push.registerFailed':
			alert("Uh oh. Push registration failed")
			break
		case 'push.registered':
			state.set('pushToken', info.deviceToken)
			api.post('push_auth', { pushToken:info.deviceToken, pushSystem:'ios' })
			break
		case 'push.notification':
			alert(info.data.aps.alert)
			break
		default:
			alert('Got unknown event ' + JSON.stringify(event))
	}
}

scoller = null
function renderApp() {
	scroller = makeScroller(viewport)
	app=div('app', viewport.fit,

		scroller.renderHead(45, function(view) {
			var baseViewNum = scroller.hasConnectView ? 2 : 1
			return div('head',
				scroller.stack.length > baseViewNum && renderBackButton(),
				div('title', view.title || 'Dogo'),
				div('devBar',
					div('button', 'R', button(function() { bridge.command('app.restart') })),
					div('button', 'X', button(function() { state.clear(); bridge.command('app.restart') }))
				)
			)
			function renderBackButton() {
				return div('button back', button(function() {
					scroller.pop()
				}))
			}
		}),

		scroller.renderBody(3, function(view) {
			console.log("render view", JSON.stringify(view))
			if (view.convo) {
				return 'convo'
			} else if (view.contact) {
				return 'contact'
			} else if (state.get('authToken')) {
				return home.render()
			} else {
				scroller.hasConnectView = true
				return connect.render(function(res) {
					state.set('authToken', res.authToken)
					state.set('account', res.account)
					var contactsByAccountId = {}
					var contactsByFacebookId = {}
					each(res.contacts, function(contact) {
						if (contact.accountId) {
							contactsByAccountId[contact.accountId] = contact
						}
						contactsByFacebookId[contact.facebookId] = contact
					})
					state.set('contactsByAccountId', contactsByAccountId)
					state.set('contactsByFacebookId', contactsByFacebookId)
					scroller.push({ account:res.account })
				})
			}
		})
	).appendTo(document.body)
}

if (navigator.userAgent.match('Chrome')) {
	bridge.command = function(command, data, callback) {
		if (!callback) {
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
		}
	}
	
	$(function() {
		bridge.eventHandler('app.start', {})
		$('.app').css({ margin:'0 auto' })
		$('body').css({ background:'#222' })
	})
	
	div({ id:'fb-root' }).appendTo(document.body)
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

	viewport.height = function() { return 480 }
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
} else {
	window.onerror = function(e) { alert('err ' + e)}
}
