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
			case 'facebook.dialog':
				var params = data.params
				FB.ui({ method:data.dialog, message:params.message, data:params.data, title:params.title, to:parseInt(params.to) }, function(res) {
					events.fire('facebook.dialogCompleteWithUrl', { url:'fake_fbconnect://success?request='+res.request })
				})
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
			case 'net.request':
				api.sendRequest({ url:data.path, params:data.params, method:data.method, headers:data.headers, callback:callback })
				break
		}
	}
	
	var indices = {}
	
	var _getState = function() {
		try { return JSON.parse(localStorage['dogo-browser-state']) } catch(e) { return {} }
	}
	
	$(function() {
		var config = {
			mode:'dev',
			device: {
				platform:'Chrome'
			},
			serverUrl:location.host
		}
		bridge.eventHandler('app.start', { config:config, client:'0.91.0-browser' })
		$('#viewport').css({ margin:'145px auto' })
		$('body').css({ background:'#222' }).prepend(
			div(style({ position:'absolute', top:0, left:0, width:'100%' }),
				img({ src:'/static/img/iphone4.png' }, style({ margin:'10px auto', display:'block' }))
			)
		)
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
	setTimeout(function(){
		if (isPhantom) { return }
		var d = document
		var js, id = 'facebook-jssdk', ref = d.getElementsByTagName('script')[0];
		if (d.getElementById(id)) {return;}
		js = d.createElement('script'); js.id = id; js.async = true;
		js.src = "//connect.facebook.net/en_US/all.js";
		ref.parentNode.insertBefore(js, ref);
	}, 400);

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
	
	var $buttons = $(div(style({ position:'absolute', top:0, left:0 })))
	each([-180, -90, 0, 90, 180], function(deg) {
		$buttons.append(div(style({ padding:10, color:'#fff' }), 'Rotate: ', deg, button(function() {
			events.fire('device.rotated', { deg:deg })
		})))
	})
	$('body').append($buttons)
}