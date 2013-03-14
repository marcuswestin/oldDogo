require('client/misc/clientGlobals')
require('client/phone/phoneClient')

var devBridge = require('./devBridge')
var devButtons = require('./devButtons') 

// In dev mode Fake the viewport width and height to be an iPhone
viewport.height = function() { return 480 }
viewport.width = function() { return 320 }
viewport.pos = function() {
	var offset = $('#viewport').offset()
	return tags.makePos(offset.left, offset.top)
}

$(startDevClient)

function startDevClient() {
	buildDevClient()
	layoutDevClient()
	$(window).resize(layoutDevClient)
	setTimeout(loadFbSdk, 400)	
	devButtons.setup()
}

function buildDevClient() {
	$('body')
		.css({ background:gradient('#111', '#161616'), overflow:'hidden' })
		.append(div(style({ position:'absolute', top:0, left:0, width:'100%' }),
			div({ id:'mockPhone' }, style({ width:380, margin:'0 auto' }),
				img({ src:'/graphics/mockPhone/iphone4-top.png' }, button(function(){}),
					style({ display:'block', position:'relative', zIndex:999 })
				),
				img({ id:'devClientStatusBar', src:'/graphics/mockPhone/iphoneStatusBar.png' }, button(function(){}),
					style({ position:'absolute', zIndex:998, opacity:.6 }, translate.x(32))
				),
				div({ id:'devClientViewportFrame' },
					style(viewport.size(), translate.x(32), { position:'absolute', overflow:'hidden' }),
					iframe({ id:'clientWindow', src:'/phone', frameBorder:'0' }, style(viewport.size()))
				),
				img({ src:'/graphics/mockPhone/iphone4-middle.png' }, button(function(){}),
					style({ margin:'0px auto', display:'block' })
				),
				img({ src:'/graphics/mockPhone/iphone4-bottom.png' }, button(function(){}),
					style({ margin:'0 auto', display:'block', position:'relative' })
				)
			)
		))
	nextTick(checkClientWindow)
	function checkClientWindow() {
		var win = $('#clientWindow')[0].contentWindow
		if (!win) { return after(50, checkClientWindow) }
		devBridge.setup(win, function() {
			devBridge.notify('app.start', {
				client:'0.98.0-browser',
				config: {
					device: { platform:'Chrome' },
					protocol: 'http:',
					serverHost:location.hostname,
					serverUrl:'http://'+location.host
				}
			})
		})
	}
}

layoutDevClient.top = function() { return Math.max(20, $(window).height() / 2 - viewport.height()/2) }
function layoutDevClient() {
	var viewportTop = layoutDevClient.top()
	var size = { width:$(window).width(), height:$(window).height() }
	$('body').css(size)
	$('#mockPhone').css({ marginTop:(viewportTop-155)+'px' })
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
