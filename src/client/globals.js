require('lib/jquery-1.8.1')

tags = require('tags')
require('tags/jquery-tags')
button = require('tags/button')
makeList = require('tags/list')
style = require('tags/style')
makeScroller = require('tags/scroller')
draggable = require('tags/draggable')
overlay = ovarlay = require('tags/overlay')
tooltip = require('tags/tooltip')
viewport = require('tags/viewport')
link = require('tags/link')

options = require('std/options')
create = require('std/create')
proto = require('std/proto')
map = require('std/map')
bind = require('std/bind')
each = require('std/each')
slice = require('std/slice')
curry = require('std/curry')
filter = require('std/filter')
flatten = require('std/flatten')
parseUrl = require('std/url')
clip = require('std/clip')
find = require('std/find')
trim = require('std/trim')
merge = require('std/merge')
nextTick = require('std/nextTick')
delayed = require('std/delayed')
parallel = require('std/parallel')
rand = require('std/rand')
sum = require('std/sum')
time = require('std/time')
isArray = require('std/isArray')

events = require('client/events')
Documents = require('client/state/Documents')
Caches = require('client/state/Caches')
sessionInfo = require('client/state/sessionInfo')
Conversations = require('client/state/Conversations')
api = require('client/api')
bridge = require('client/bridge')
face = require('client/ui/face')
paint = require('client/ui/paint')

colors = require('client/colors')
rgb = colors.rgb
rgba = colors.rgba
blues = colors.blues
teals = colors.teals
greens = colors.greens
yellows = colors.yellows
oranges = colors.oranges
reds = colors.reds
purples = colors.purples


Addresses = require('data/Addresses')
Payloads = require('data/Payloads')
DogoText = require('data/DogoText')

graphics = require('client/graphics')
graphic = graphics.graphic

gradient = function gradient(from, to) {
	return '-webkit-linear-gradient('+from+', '+to+')'
}
radialGradient = function radialGradient(center, from, to, extent) {
	return '-webkit-radial-gradient('+center+', circle cover, '+from+' 0%, '+to+' '+extent+')'
}
px = function px(pixels) {
	if (!isArray(pixels)) { pixels = slice(arguments) }
	return map(pixels, function(arg) {
		return arg+'px'
	}).join(' ')
}

link.defaultTarget = '_blank'

div = tags('div')
span = tags('span')
a = tags('a')
input = tags('input')
img = tags('img')
canvas = tags('canvas')
label = tags('label')
br = tags.br
html = tags.html

translate = style.translate
transition = style.transition
scrollable = style.scrollable
absolute = function(left, top) { return { position:'absolute', left:left, top:top } }
fixed = function(left, top) { return { position:'fixed', left:left, top:top } }

bold = { fontWeight:'bold' }
italic = { fontStyle:'italic' }
underline = { textDecoration:'underline' }

var ulTag = tags('ul')
var li = tags('li')
ul = function() {
	return ulTag(map(arguments, function(content) {
		return li('tags-ul-li', content)
	}))
}


BT = {
	url:function(module, path, params) {
		return gAppInfo.config.serverUrl+'/'+module+'/'+path+'?'+parseUrl.query.string(params)
	}
}

error = function error(err) {
	if (err == undefined) { return }
	overlay.hide()
	var margin = 0
	var cornerSize = 40
	var message = api.error(err)
	if (!error.$tag) {
		error.$tag = $(div({ id:'errorNotice' },
			style({ position:'absolute', top:20+margin, left:cornerSize+margin, width:viewport.width() - cornerSize*2 - margin*4 }),
			div('content',
				style({ maxHeight:240 }, scrollable.y),
				div('close', style({ 'float':'right' }), 'X', button(function() { error.hide() })),
				div('message')
			)
		)).appendTo('#viewport')
	}
	setTimeout(function() {
		error.$tag
			.css({ visibility:'hidden' })
			.find('.message').text(message)
		setTimeout(function() {
			error.$tag
				.css(translate.y(-(error.$tag.height() + 30), 0))
				.css({ visibility:'visible' })
			setTimeout(function() {
				error.$tag.css(translate.y(0, 400))
			})
		})
	})
	error.hide = function() {
		error.$tag.css(translate.y(-(error.$tag.height() + 30)))
	}
}
error.hide = function() {}
error.handler = function(err, res) {
	if (err) { error(err) }
}

gConfigure = function(config) {
	payloads.configure(config.payloads)
}

spacing = 8


var unitGridShowing = false
toggleUnitGrid = function() {
	if (unitGridShowing) {
		$('#unitGrid').remove()
	} else {
		var unit2 = unit * 2
		var numX = viewport.width() / unit2 - 1
		var numY = viewport.height() / unit2 - 1
		$('#viewport').append(div({ id:'unitGrid' }, style(absolute(0,0)),
			map(new Array(numX), function(_, x) {
				var width = ((x + 1) % 10 == 0 ? 2 : 1)
				return div(style({ width:width, background:'red', opacity:.3, height:viewport.height() }, absolute(x*unit2 + unit2, 0)))
			}),
			map(new Array(numY), function(_, y) {
				var height = ((y + 1) % 10 == 0 ? 2 : 1)
				return div(style({ width:viewport.width(), background:'red', opacity:.3, height:height }, absolute(0, y*unit2 + unit2)))
			})
		))
	}
	unitGridShowing = !unitGridShowing
}
clearState = function() {
	bridge.command('BTFiles.clearAll', function(err) {
		if (err) { return error(err) }
		bridge.command('app.restart')
	})
}

events.on('app.start', function() {
	viewport.element = $('#viewport')
	
	listMenuArrow = div(graphics.graphic('listMenuArrow', 16, 16), style({ 'float':'right' }, translate(0, 3)))
	connectButton = [style({ display:'block', padding:px(unit*1.5), margin:px(2*unit, 4*unit), border:'1px solid rgba(255,255,255,.5)' }), listMenuArrow]

	events.on('app.error', function(info) {
		api.post('api/log/app/error', info, function(){})
	})
	var oldLog = console.log
	console.log = function() {
		oldLog.apply(console, arguments)
		api.post('api/log/app/console', { args:slice(arguments, 0) }, function(){})
	}
})

listMenuIcon = function(graphicName) {
	return graphics.graphic(graphicName, 20, 20, translate.y(2), { 'float':'left', margin:px(0,unit/2) })
}
listMenuContent = function(graphicName, label) {
	return [
		listMenuIcon(graphicName),
		listMenuArrow,
		span(style({ paddingLeft:unit }), label)
	]
}

radius = function() { return { borderRadius:px.apply(this, arguments) } }
floatLeft = { 'float':'left' }
floatRight = { 'float':'right' }
unitPadding = function() { return { padding:px.apply(this, map(arguments, function(p) { return p*unit })) } }
unitMargin = function() { return { margin:px.apply(this, map(arguments, function(p) { return p*unit })) } }
fullHeight = fillHeight = { height:'100%' }
fullWidth = fillWidth = { width:'100%' }


markFirstCall = function(fn) {
	var firstCall = true
	return function() {
		var res = fn.apply(this, [firstCall].concat(slice(arguments, 0)))
		firstCall = false
		return res
	}
}

after = function(duration, fn) { setTimeout(fn, duration) }