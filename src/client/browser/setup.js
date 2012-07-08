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
			case 'facebook.connect':
				FB.login(function(response) {
					callback(null, response.authResponse)
				}, { scope:data.permissions.join(',') })
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
		}
	}
	
	var indices = {}
	
	var _getState = function() { try { return JSON.parse(localStorage['dogo-browser-state']) } catch(e) { return {} } }
	
	$(function() {
		bridge.eventHandler('app.start', { config: { mode:'dev' }, bundleVersion:'DevChrome' })
		$('.app').css({ margin:'-165px auto' })
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
	
	var $buttons = $(div())
	each([-180, -90, 0, 90, 180], function(deg) {
		$buttons.append(div(style({ padding:10, color:'#fff' }), 'Rotate: ', deg, button(function() {
			events.fire('device.rotated', { deg:deg })
		})))
	})
	$('body').append($buttons)
}