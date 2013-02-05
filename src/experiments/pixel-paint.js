require('client/globals')
require('website/template/scrollToTop')

var makePaint = require('client/ui/paint')

var size = [320, 480]
var density = 2

var paint = makePaint([size[0] * density, size[1] * density], density)
var data

paint.style('#000').fillAll()

function subtract(pos1, pos2) {
	return tags.makePos(pos1[0]-pos2[0], pos1[1]-pos2[1])
}
function half(pos) {
	return tags.makePos(pos[0] / 2, pos[1] / 2)
}
function add(pos1, pos2) {
	return tags.makePos(pos1[0] + pos2[0], pos1[1], pos2[1])
}
function distanceSquared(p1, p2) {
	var dx = p1[0] - p2[0]
	var dy = p1[1] - p2[1]
	return dx*dx + dy*dy
}

function mixChannel(data, pixelOffset, channel, newRgba) {
	data[pixelOffset + channel] = data[pixelOffset + channel] * .5 + newRgba[channel] * .5
}

// Checkout http://www.pixastic.com/lib/git/pixastic/actions/blend.js for blending example

function mixChannelAOverB(data, pixelOffset, newRgba, channel) {
	// Over operator, as per http://en.wikipedia.org/wiki/Alpha_compositing
	var overAlpha = 256 / newRgba[3]
	var underAlpha = 256 / data[pixelOffset + 3]
	data[pixelOffset + channel] = (newRgba[channel] * overAlpha) + (data[pixelOffset + channel] * underAlpha) * (1 - overAlpha)
}

// Composite.js https://gist.github.com/1697003
// function _composite(under, over) {
// 	var alphaO = over[3],
// 		alphaU = under[3],
// 		invAlphaO = 1 - alphaO,
// 		i,
// 		len;
//  
// 	for(i = 0, len = under.length - 1; i < len; ++i) {
// 		under[i] = Math.round((over[i] * alphaO) 
// 			+ ((under[i] * alphaU) * invAlphaO));
// 	}
// }

function mixPixelColor(data, pixelOffset, newRgba) {
	mixChannelAOverB(data, pixelOffset, newRgba, 0)
	mixChannelAOverB(data, pixelOffset, newRgba, 1)
	mixChannelAOverB(data, pixelOffset, newRgba, 2)
}

var lastPos

$('#viewport').append(
	div({ id:'canvas' }, style({ width:size[0], height:size[1], margin:'0 auto' }), draggable({
		threshold:0,
		start:withPos(function(pos) {
			lastPos = pos
		}),
		move:withPos(function(pos) {
			var drawSize = [20,20]
			var halfDrawSize = half(drawSize)
			var maxDelta = distanceSquared([0,0], halfDrawSize)
			paint.drawPixels(subtract(pos, half(drawSize)), drawSize, function(data, tools) {
				for (var y=0; y<drawSize[1]*density; y++) {
					for (var x=0; x<drawSize[0]*density; x++) {
						var pixel = [x,y]
						// var pixelIndex = tools.getIndex(add(pos, pixel))
						// if (touched[pixelIndex]) { continue }
						// touched[pixelIndex] = true
						var index = tools.getIndex(pixel)
						var fadeRatio = clip(distanceSquared(pixel, halfDrawSize) / maxDelta, 0, 1)
						if (fadeRatio > .2) { continue; }
						data[index] = 255
						// mix values
						// mixPixelColor(data, index, [200,123,1,256])
					}
				}
			})
		}),
		end:withPos(function(pos) {
		}),
		tap:withPos(function(pos) {
			paint.drawPixels([0,0], [size[0]*density, size[1]*density], function(data, tools) {
				for (var y=0; y<size[1]*density; y++) {
					for (var x=0; x<size[0]*density; x++) {
						var index = (y * size[1] + x) * 4
						var value = x * y & 0xff
						// data[index] = value;        // red
						// data[index + 1] = value;    // green
						data[index + 2] = value;    // blue
						data[index + 3] = 255;      // alpha
					}
				}
			})
		})
	}))
)

$('#canvas').append(paint.el)

function withPos(handlerFn) {
	return function(pos) {
		handlerFn(tags.makePos(pos[0] * density, pos[1] * density))
	}
}

// $()
// 	.on(tags.events.start, positionHandler(function onStart(pos) {
// 		console.log('start', pos)
// 	}))
// 	.on(tags.events.move, positionHandler(function onMove(pos) {
// 		console.log('move', pos)
// 	}))
// 	.on(tags.events.end, positionHandler(function onEnd(pos) {
// 		console.log('end', pos)
// 	}))
// 	.appendTo()
// 

