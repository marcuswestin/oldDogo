require('lib/jquery-1.7.2')
require('tags')
require('tags/button')
require('tags/list')
require('tags/style')
require('tags/scroller')

require('./events')

create = require('std/create')
map = require('std/map')
api = require('./api')
bridge = require('./bridge')
face = require('ui/face')
bind = require('std/bind')
viewport = require('tags/viewport')
each = require('std/each')
slice = require('std/slice')
curry = require('std/curry')
button = tags.button
list = tags.list
style = tags.style
tags.expose()

var time = require('std/time')

button.onError = error = function(err) {
	alert("Oops! "+JSON.stringify(err))
}

var connect = require('./ui/connect'),
	home = require('./ui/home'),
	conversation = require('./ui/conversation')

config = {}
state = {
	get: function(name) {
		var val = localStorage[name]
		return val ? JSON.parse(localStorage[name]) : undefined
	},
	set: function(name, val) {
		localStorage[name] = JSON.stringify(val)
	},
	clear: function() {
		localStorage.clear()
	}
}

contactsByAccountId = state.get('contactsByAccountId') || {}
contactsByFacebookId = state.get('contactsByFacebookId') || {}
myAccount = state.get('myAccount')
updateContacts = function(contacts) {
	contactsByAccountId = {}
	contactsByFacebookId = {}
	each(contacts, function(contact) {
		if (contact.accountId) {
			contactsByAccountId[contact.accountId] = contact
		}
		contactsByFacebookId[contact.facebookId] = contact
	})
	state.set('contactsByAccountId', contactsByAccountId)
	state.set('contactsByFacebookId', contactsByFacebookId)
}

accountKnown = function(accountId) { return !!contactsByAccountId[accountId] }

loadFacebookId = function(facebookId, callback) {
	_loadAccount(null, facebookId, contactsByFacebookId, 'contactsByFacebookId', loadFacebookId.queue, callback)
}
loadFacebookId.queue = {}

loadAccountId = function(accountId, callback) {
	_loadAccount(accountId, null, contactsByAccountId, 'contactsByAccountId', loadAccountId.queue, callback)
}
loadAccountId.queue = {}

_loadAccount = function(accountId, facebookId, stash, stashKey, queue, callback) {
	if (!accountId && !facebookId) { throw new Error("loadAccount: Undefined accountId") }
	var id = accountId || facebookId
	if (stash[id]) {
		callback && (stash[id])
		return stash[id]
	} else {
		if (queue[id]) {
			queue[id].push(callback)
		} else {
			queue[id] = [callback]
			api.get('account_info', { accountId:accountId, facebookId:facebookId }, function(err, res) {
				if (err) { return error(err) }
				stash[id] = res.account
				state.set(stashKey, stash)
				each(queue[id], function(callback) {
					callback(res.account)
				})
				delete queue[id]
			})
		}
	}
}

events.on('app.start', function(info) {
	config = info
	renderApp()
	bridge.command('app.show')
})

events.on('push.registerFailed', function(info) {
	alert("Uh oh. Push registration failed")
})

events.on('push.registered', function(info) {
	state.set('pushToken', info.deviceToken)
	api.post('push_auth', { pushToken:info.deviceToken, pushSystem:'ios' })
})

events.on('push.notification', function(info) {
	var data = info.data
	data.body = data.aps.alert
	events.fire('push.message', data)
	bridge.command('device.vibrate')
})

bridge.eventHandler = function(name, info) { events.fire(name, info) }

scroller = null
function renderApp() {
	scroller = tags.scroller(viewport)
	$(document.body).append(div('app', viewport.fit,

		scroller.renderHead(45, function($head, view, viewBelow, fromView) {
			var showBackButton = viewBelow && (scroller.stack.length > (scroller.hasConnectView ? 2 : 1))
			$head.append(div('head',
				showBackButton && renderBackButton(viewBelow.title || 'Home'),
				div('title', view.title || 'Dogo'),
				(config.mode == "dev") && div('devBar',
					div('button', 'R', button(function() { bridge.command('app.restart') })),
					div('button', 'X', button(function() { state.clear(); bridge.command('app.restart') }))
				)
			))
			function renderBackButton(title) {
				return div('button back', title, button(function() {
					scroller.pop()
				}))
			}
		}),

		scroller.renderBody(3, function($body, view) {
			console.log("render view", JSON.stringify(view))
			if (view.conversation) {
				conversation.render($body, view.conversation)
			} else if (state.get('authToken')) {
				home.render($body, view)
			} else {
				scroller.hasConnectView = true
				connect.render($body, function(res) {
					myAccount = res.account
					updateContacts(res.contacts)
					state.set('myAccount', myAccount)
					state.set('authToken', res.authToken)
					scroller.push({ account:res.account, title:'Dogo' })
					
					bridge.command('push.register')
				})
			}
		})
	))
}

if (!tags.isTouch) {
	// Browser for debugging
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
		bridge.eventHandler('app.start', { mode:'dev' })
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
	console.log = function() {
		bridge.command('console.log', slice(arguments))
	}
}
