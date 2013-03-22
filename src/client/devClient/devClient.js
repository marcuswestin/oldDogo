require('client/misc/clientGlobals')

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
	devButtons.setup()
}

function buildDevClient() {
	var client = location.hash.substr(1) || 'phone'
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
					iframe({ id:'clientWindow', src:'/'+client, frameBorder:'0' }, style(viewport.size()))
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
		if (!win || !win.webEngine) { return after(50, checkClientWindow) }
		var link = win.document.createElement('link')
		link.rel = "stylesheet"
		link.type = "text/css"
		link.href = "/stylus/styl/fonts/opensans-all.styl"
		win.document.getElementsByTagName('head')[0].appendChild(link)
		
		win.webEngine.start(function() {
			win.viewport.height = function() { return 480 }
			win.viewport.width = function() { return 320 }
			win.viewport.pos = function() {
				var offset = $('#viewport').offset()
				return tags.makePos(offset.left, offset.top)
			}
		})
	}
}

function getTop() { return Math.max(20, $(window).height() / 2 - viewport.height()/2) }
function layoutDevClient() {
	var viewportTop = getTop()
	var size = { width:$(window).width(), height:$(window).height() }
	$('body').css(size)
	$('#mockPhone').css({ marginTop:(viewportTop-155)+'px' })
}
