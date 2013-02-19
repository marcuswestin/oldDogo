require('client/globals')
require('client/phone/phoneClient')

var devBridge = require('./devBridge')
var devButtons = require('./devButtons') 

unit = 8
gHeadHeight = unit
gKeyboardHeight = 216

// In dev mode Fake the viewport width and height to be an iPhone
viewport.height = function() { return 480 }
viewport.width = function() { return 320 }

startDevClient()

function startDevClient() {
	
	devBridge.setup()
	devButtons.setup()
	
	buildDevClient()
	layoutDevClient()
	$(window).resize(layoutDevClient)
	setTimeout(loadFbSdk, 400)
	
	bridge.eventHandler('app.start', {
		client:'0.98.0-browser',
		config: {
			device: { platform:'Chrome' },
			serverHost:location.hostname,
			serverUrl:'http://'+location.host
		}
	})
}

function buildDevClient() {
	$('body')
		.css({ background:gradient('#222', '#333') })
		.append(
			div(style({ position:'absolute', top:0, left:0, width:'100%' }),
				button(function(){}),
				img({ id:'mockStatusBar', src:'/graphics/mockPhone/iphoneStatusBar.png' },
					style({ width:320, display:'block', margin:'0 auto', position:'relative', zIndex:1, opacity:.6
				})),
				img({ id:'mockPhone', src:'/graphics/mockPhone/iphone4.png' },
					style({ margin:'0px auto', display:'block' })
				)
			)
		)
		.append(
			div({ id:'viewport' }, style(viewport.size(), { margin:'0 auto' }))
		)
		.append(
			div({ id:'mockPhoneBottom' },
				style({ position:'absolute', left:0, width:'100%' }),
				button(function(){}),
				img({ src:'/graphics/mockPhone/iphone4-bottom.png' }, style({ margin:'0 auto', display:'block' }))
			)
		)
}

function layoutDevClient() {
	var viewportTop = Math.max(20, $(window).height() / 2 - viewport.height()/2)
	var size = { width:$(window).width(), height:$(window).height() }
	$('body').css(size)
	$('#viewport').css(translate.y(viewportTop))
	$('#mockPhone').css({ marginTop:(viewportTop-155)+'px' })
	$('#mockStatusBar').css({ top:viewportTop })
	$('#mockPhoneBottom').css({ top:viewportTop + viewport.height() })
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
