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
list = require('dom/list')
slice = require('std/slice')
isTouch = require('dom/isTouch')
curry = require('std/curry')

error = function(err) {
	alert("Oops! "+JSON.stringify(err))
}

var tags = require('dom/tags')
	makeScroller = require('dom/scroller'),
	connect = require('./ui/connect'),
	home = require('./ui/home'),
	conversation = require('./ui/conversation')

tags.expose()
tags.enableJQueryTags()

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

contactsByAccountId = state.get('contactsByAccountId')
contactsByFacebookId = state.get('contactsByFacebookId')
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
withAccount = function(accountId, callback) {
	if (contactsByAccountId[accountId]) {
		callback(contactsByAccountId[accountId])
	} else {
		api.get('account_info', { accountId:accountId }, function(err, res) {
			if (err) { return error(err) }
			contactsByAccountId[accountId] = res.account
			state.set('contactsByAccountId', contactsByAccountId[accountId])
			callback(res.account)
		})
	}
}

onMessage = function(handler) { onMessage.handlers.push(handler) }
onMessage.handlers = []

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
			var data = info.data
			each(onMessage.handlers, function(handler) {
				handler({ senderAccountId:data.senderAccountId, body:data.aps.alert })
			})
			break
		default:
			alert('Got unknown event ' + JSON.stringify(event))
	}
}

scoller = null
function renderApp() {
	scroller = makeScroller(viewport)
	app=div('app', viewport.fit,

		scroller.renderHead(45, function(headTag, view, viewBelow, fromView) {
			var showBackButton = viewBelow && (scroller.stack.length > (scroller.hasConnectView ? 2 : 1))
			headTag.append(div('head',
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

		scroller.renderBody(3, function(bodyTag, view) {
			console.log("render view", JSON.stringify(view))
			if (view.convo || view.contact) {
				conversation.render(bodyTag, view)
			} else if (state.get('authToken')) {
				home.render(bodyTag, view)
			} else {
				scroller.hasConnectView = true
				connect.render(bodyTag, function(res) {
					myAccount = res.account
					updateContacts(res.contacts)
					state.set('myAccount', myAccount)
					state.set('authToken', res.authToken)
					scroller.push({ account:res.account, title:'Dogo' })
					
					bridge.command('push.register')
				})
			}
		})
	).appendTo(document.body)
}

if (!isTouch) {
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
	console.log = function() {
		bridge.command('console.log', slice(arguments))
	}
}
