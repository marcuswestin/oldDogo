require('lib/jquery-1.8.1')

tags = require('tags')
require('tags/jquery-tags')
button = require('tags/button')
list = require('tags/list')
style = require('tags/style')
makeScroller = require('tags/scroller')
draggable = require('tags/draggable')
overlay = ovarlay = require('tags/overlay')
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

events = require('client/events')
gState = require('client/state')
api = require('client/api')
bridge = require('client/bridge')
face = require('client/ui/face')
paint = require('client/ui/paint')
colors = require('client/colors')

Addresses = require('data/Addresses')
Payloads = require('data/Payloads')

isArray = require('std/isArray')

graphic = require('ui/graphic')
icon = require('ui/icon')

gradient = function gradient(from, to) { return '-webkit-linear-gradient('+from+', '+to+')' }
px = function px(pixels) {
	if (!isArray(pixels)) { pixels = slice(arguments) }
	return map(pixels, function(arg) {
		return arg+'px'
	}).join(' ')
}

overlay.defaultElement = $('#viewport')
link.defaultTarget = '_blank'

div = tags('div')
span = tags('span')
br = function() { return { __tagHTML:'<br />' } }
a = tags('a')
input = tags('input')
img = tags('img')
canvas = tags('canvas')
label = tags('label')

translate = style.translate
transition = style.transition
scrollable = style.scrollable
absolute = function(left, top) { return { position:'absolute', left:left, top:top } }

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
	overlay.hide()
	var margin = 0
	var cornerSize = 40
	var message = api.error(err)
	if (!error.$tag) {
		error.$tag = $(div({ id:'errorNotice' },
			style({ position:'absolute', top:20+margin, left:cornerSize+margin, width:viewport.width() - cornerSize*2 - margin*4 }),
			div('content',
				style({ maxHeight:240 }, scrollable.y),
				div('close', style({ 'float':'right' }), icon('icon-circlex', 22, 23), button(function() { error.hide() })),
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
