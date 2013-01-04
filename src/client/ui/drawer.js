var pens = require('./pens')
var paint = require('./paint')
var pictures = require('../../data/pictures')
var makeToolPicker = require('./pickers/toolPicker')

module.exports = {
	render:render,
	remove:remove
}

var state = {
	pen:null,
	toolPicker:null
}

var canvasDensity
var background

var $ui

var opts

var controlsDuration = 350

var p
var $paint

function remove() {
	if (!$ui) { return }
	$ui.remove()
	$ui = null
}

var pixelRatio = 2 // Always 2, to make the resulting image from normal 320 display be 640 dense for retina displays as well

function render(_opts) {
	
	var dim = Math.min(viewport.width(), viewport.height())
	canvasDensity = [dim * pixelRatio, dim * pixelRatio]
	
	opts = options(_opts, { onHide:null, onSend:null, img:null, message:null })
	
	p = paint([dim, dim], pixelRatio)
	
	$ui = $(div('drawer', style(viewport.getSize()), style(translate(0,0)),
	
		gIsDev && div('button', style({ position:'absolute', top:10, left:10, padding:15 }), 'Reload', button(function() {
			bridge.command('app.restart')
		})),
		
		// div('loading', 'Loading...'),
		div('close button',
			icon('glyphish/xtras-white/37-circle-x', 28, 28),
			style({ bottom:viewport.height() - 30, right:3 }, transition('-webkit-transform', controlsDuration)),
			button(function() { opts.onHide() })
		),
		div('controls-pos', style(transition('-webkit-transform', controlsDuration)),
			div('controls-rot', style(transition('-webkit-transform', controlsDuration)),
				div('controls', style({ width:dim }, transition('width', controlsDuration)),
					div('tools',
						state.toolPicker = makeToolPicker({ paint:p, width:dim, height:dim }),
						div('right',
							div('button undo secondary', icon('glyphish/white/213-reply', 23, 17), button(undoDraw)),
							div('button send', 'Send', button(sendImage))
						)
					)
				)
			)
		)
	))
	
	$ui.append($paint = $(p.el).addClass('paint'))
	
	p.withBackground(function(bg) {
		bg.fillStyle('#FFFFFF').fillRect([0,0], canvasDensity)
	})
	if (opts.background) {
		drawBackgroundImage(opts.background.url, opts.background.size[0], opts.background.size[1])
	}
	
	if (tags.isTouch) {
		$paint.on('touchstart', pencilDown).on('touchmove', pencilMove).on('touchend', pencilUp)
	} else {
		$paint.on('mousedown', pencilDown).on('mousemove', pencilMove).on('mouseup', pencilUp)
	}
	
	return $ui
	
	function undoDraw() { p.popLayer() }
	
	function drawBackgroundImage(url, picWidth, picHeight) {
		var drawImg = new Image()
		drawImg.onload = function() {
			p.withBackground(function(bg) {
				var delta = [canvasDensity[0] - picWidth, canvasDensity[1] - picHeight]
				bg
					.fillStyle('#FFFFFF').fillRect([0, 0], canvasDensity)
					.save()
						.translate([delta[0] / 2, delta[1] / 2])
						.drawImage(drawImg, [0, 0], [picWidth, picHeight])
						.restore()
			})
			$ui.find('.loading').remove()
		}
		drawImg.src = url
	}
	
	function getPoint($e) {
		var coords = $e.originalEvent
		if (tags.isTouch) {
			coords = coords.changedTouches[0]
		}
		var offset = $paint.offset()
		return [
			(coords.pageX - (tags.isTouch ? 0 : offset.left)) * pixelRatio,
			(coords.pageY - offset.top) * pixelRatio
		]
	}
	
	function pencilDown(e) {
		e.preventDefault()
		p.pushLayer()
		state.tool = state.toolPicker.getCurrent()
		state.tool.handleDown(getPoint(e))
	}

	function pencilMove(e) {
		e.preventDefault()
		if (!state.tool) { return }
		state.tool.handleMove(getPoint(e))
	}

	function pencilUp(e) {
		e.preventDefault()
		if (!state.tool) { return }
		state.tool.handleUp(getPoint(e))
		state.tool = null
	}
}

function sendImage() {
	var data = p.snapshot().toDataURL('image/jpeg')
	opts.onSend(data, canvasDensity[0], canvasDensity[1])
}
