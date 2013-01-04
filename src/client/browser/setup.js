var index = require('./index')
var textInput = require('./textInput')

module.exports = {
	setup:setupBrowserDebugMode
}

function setupBrowserDebugMode() {
	// Browser for debugging
	bridge.command = function onBridgeCommand(command, data, callback) {
		if (!callback && typeof data == 'function') {
			callback = data
			data = null
		}
		console.log('fake bridge', command, data)
		switch(command) {
			case 'push.register':
				callback(null)
				break
			case 'facebook.connect':
				FB.login(function(response) {
					callback(null, { facebookSession:response.authResponse })
				}, { scope:data.permissions.join(',') })
				break
			case 'facebook.dialog':
				var params = data.params
				FB.ui({ method:data.dialog, message:params.message, data:params.data, title:params.title, to:parseInt(params.to) }, function(res) {
					events.fire('facebook.dialogCompleteWithUrl', { url:'fake_fbconnect://success?request='+res.request })
				})
				break
			case 'facebook.clear':
				callback(null)
			case 'app.restart':
				location.reload()
				break
			case 'state.set':
				setTimeout(function() {
					var state = _getState(); state[data.key] = data.value;
					localStorage['dogo-browser-state'] = JSON.stringify(state)
				})
				break
			case 'state.clear':
				setTimeout(function() {
					localStorage.clear()
				})
				break
			case 'state.load':
				setTimeout(function() {
					callback(null, _getState()[data.key])
				})
				break
			case 'index.build':
				index.build(data)
				break
			case 'index.lookup':
				index.lookup(data, callback)
				break
			case 'textInput.show':
				textInput.show(data)
				break
			case 'textInput.animate':
				textInput.animate(data)
				break
			case 'textInput.set':
				textInput.set(data)
				break
			case 'textInput.hide':
				textInput.hide()
				break
			case 'net.request':
				api.sendRequest({ url:data.path, params:data.params, method:data.method, headers:data.headers, callback:callback })
				break
		}
	}
	
	var _getState = function() {
		try { return JSON.parse(localStorage['dogo-browser-state']) } catch(e) { return {} }
	}
	
	$(function() {
		var config = {
			device: {
				platform:'Chrome'
			},
			serverHost:location.hostname,
			serverUrl:'http://'+location.host
		}
		bridge.eventHandler('app.start', { config:config, client:'0.97.0-browser' })
		gViewportTop = 55
		$('#viewport').css({ margin:'0 auto', position:'relative', top:gViewportTop, height:viewport.height() })
		$('body').css({ background:'#222' }).prepend(
			div(style({ position:'absolute', top:0, left:0, width:'100%' }),
				button(function(){}),
				img({ src:'/graphics/mockPhone/iphoneStatusBar.png' }, style({ width:320, display:'block', margin:'0 auto', position:'relative', top:34 })),
				img({ src:'/graphics/mockPhone/iphone4.png' }, style({ margin:'-120px auto', display:'block' }))
			)
		)
	})
	
	if (!gIsPhantom) {
		// Load the FB SDK Asynchronously
		setTimeout(loadFbSdk, 400)
	}
	
	
	// Create buttnos for rotating the ui
	var $buttons = $(div(style({ position:'absolute', top:0, left:0 })))
	var padded = style({ padding:10, color:'#fff' })
	each([-180, -90, 0, 90, 180], function(deg) {
		$buttons.append(div(padded, 'Rotate: ', deg, button(function() {
			events.fire('device.rotated', { deg:deg })
		})))
	})
	$buttons.append(div(padded, 'Clear state', button(function() {
		gState.clear()
	})))
	$buttons.append(div(padded, 'Run Usage tests', button(function() {
		var clientTests = require('../clientTests')
		clientTests.runUsageTests()
	})))
	$buttons.append(div(padded, 'Run Connect tests', button(function() {
		var clientTests = require('../clientTests')
		clientTests.runConnectTests()
	})))
	var splashShowing = false
	$buttons.append(div(padded, 'Toggle Splash Screen', button(function() {
		var duration = 500
		if (splashShowing) {
			$('#splashScreen').css({ opacity:0 })
			setTimeout(function() { $('#splashScreen').remove() }, duration)
		} else {
			$('#viewport').append(
				img({ id:'splashScreen', src:'/client/ios/Default.png' },
					style({ position:'absolute', top:-20, left:0, opacity:0, zIndex:2, width:viewport.width(), height:viewport.height()+20 }),
					style(transition({ opacity:500 }))
				)
			)
			setTimeout(function() { $('#splashScreen').css({ opacity:1 }) })
		}
		splashShowing = !splashShowing
	})))
	$('body').append($buttons)
}

function loadFbSdk() {
	$(document.body).append(div({ id:'fb-root' }))
	window.fbAsyncInit = function() {
		FB.init({
			appId      : '219049001532833', // App ID
			status     : false, // check login status
			cookie     : false, // enable cookies to allow the server to access the session
			xfbml      : false  // parse XFBML
		})
	};
	
	var d = document
	var js, id = 'facebook-jssdk', ref = d.getElementsByTagName('script')[0];
	if (d.getElementById(id)) {return;}
	js = d.createElement('script'); js.id = id; js.async = true;
	js.src = "//connect.facebook.net/en_US/all.js";
	ref.parentNode.insertBefore(js, ref);
}