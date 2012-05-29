require('lib/jquery-1.7.2')
require('tags')
require('tags/button')
require('tags/list')
require('tags/style')
require('tags/scroller')

require('./events')
require('./state')

options = require('std/options')
create = require('std/create')
proto = require('std/proto')
map = require('std/map')
api = require('./api')
bridge = require('./bridge')
face = require('ui/face')
bind = require('std/bind')
viewport = require('tags/viewport')
each = require('std/each')
slice = require('std/slice')
curry = require('std/curry')
button = tags.button
list = tags.list
style = tags.style
tags.expose()

createCanvas = function(width, height, styles) {
	var ratio = window.devicePixelRatio || 1
	var canvasSize = { width:width * ratio, height:height * ratio }
	var tag = canvas(canvasSize, style({ width:width, height:height }), styles)
	var ctx = $(tag)[0].getContext('2d')
	ctx.scale(ratio, ratio)
	return { tag:tag, ctx:ctx }
}
