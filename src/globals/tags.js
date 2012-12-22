tags = require('tags')

viewport = require('tags/viewport')
if (gIsPhantom || !tags.isTouch) {
	// In dev mode Fake the viewport width and height to be an iPhone
	viewport.height = function() { return 460 }
	viewport.width = function() { return 320 }
}

button = require('tags/button')
list = require('tags/list')
style = require('tags/style')
makeScroller = require('tags/scroller')
draggable = require('tags/draggable')

div = tags('div')
span = tags('span')
br = tags('br')
a = tags('a')
input = tags('input')
img = tags('img')
canvas = tags('canvas')
transition = style.transition
translate = style.translate
