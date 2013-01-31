tags = require('tags')
require('tags/jquery-tags')
button = require('tags/button')
list = require('tags/list')
style = require('tags/style')
makeScroller = require('tags/scroller')
draggable = require('tags/draggable')

viewport = require('tags/viewport')
if (gIsPhantom || !tags.isTouch) {
	// In dev mode Fake the viewport width and height to be an iPhone
	viewport.height = function() { return 480 }
	viewport.width = function() { return 320 }
}

div = tags('div')
span = tags('span')
br = function() { return { __tagHTML:'<br />' } }
a = tags('a')
input = tags('input')
img = tags('img')
canvas = tags('canvas')

translate = style.translate
transition = style.transition
scrollable = style.scrollable

absolute = function(left, top) { return { position:'absolute', left:left, top:top } }
