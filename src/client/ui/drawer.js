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
	
	$ui = $(div('drawer', style(viewport.getSize()),
		// div('loading', 'Loading...'),
		div('close button',
			div('icon'),
			style({ bottom:viewport.height() - 30, right:3 }, transition('-webkit-transform')),
			button(function() { opts.onHide() })
		),
		div('controls-pos', style(transition('-webkit-transform', controlsDuration)),
			div('controls-rot', style(transition('-webkit-transform', controlsDuration)),
				div('controls', style({ width:dim }, transition('width', controlsDuration)),
					div('tools',
						state.toolPicker = makeToolPicker({ paint:p, width:dim, height:dim }),
						div('right',
							div('button undo secondary', div('icon'), button(undoDraw)),
							div('button send', 'Send', button(sendImage))
						)
					)
				)
			)
		)
	))
	
	$ui.append($paint = $(p.el).css({ top:gScroller.$head.height() }))
	
	p.withBackground(function(bg) {
		bg.fillStyle('#FFFFFF').fillRect([0,0], canvasDensity)
	})
	if (opts.img) {
		// TODO this call is way overloaded
		loadBackgroundImage({ mediaId:opts.img.mediaId, style:opts.img.style, width:opts.message.pictureWidth, height:opts.message.pictureHeight, pictureSecret:opts.message.pictureSecret, conversationId:opts.message.conversationId })
	}
	
	if (tags.isTouch) {
		$paint.on('touchstart', pencilDown).on('touchmove', pencilMove).on('touchend', pencilUp)
	} else {
		$paint.on('mousedown', pencilDown).on('mousemove', pencilMove).on('mouseup', pencilUp)
	}
	
	return $ui
	
	function undoDraw() { p.popLayer() }
	
	function loadBackgroundImage(opts) {
		if (opts.mediaId) {
			doDrawBackgroundImage('/blowtorch/media/'+opts.mediaId+'.jpg', opts.width, opts.height)
		} else if (opts.backgroundPath) {
			doDrawBackgroundImage('/static/'+opts.backgroundPath, opts.width, opts.height)
		} else if (opts.pictureSecret) {
			// TODO Show loading indicator
			var pictureUrl = pictures.url(opts.conversationId, opts.pictureSecret)
			doDrawBackgroundImage(pictureUrl, opts.width, opts.height)
		} else if (opts.style) {
			var underlyingUrl = opts.style.background.match(/url\((.*)\)/)[1]
			if (underlyingUrl.match(/^data/) || !tags.isTouch) {
				doDrawBackgroundImage(underlyingUrl, opts.width, opts.height)
			}
		}
	}
	
	function doDrawBackgroundImage(url, picWidth, picHeight) {
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
	var data = p.snapshot().toDataURL('image/jpg')
	opts.onSend(data, canvasDensity[0], canvasDensity[1])
}

// var rotationDeg
// events.on('device.rotated', function(info) {
// 	if (!$ui) { return }
// 	var deg = rotationDeg = info.deg
// 	var $pos = $ui.find('.controls-pos')
// 	var $rot = $ui.find('.controls-rot')
// 	var $controls = $ui.find('.controls')
// 	var $close = $ui.find('.close.button')
// 	if (Math.abs(deg) == 180) { return }
// 	if (deg == 0) {
// 		$close.css({ '-webkit-transform':'none' })
// 		$controls.css({ width:width })
// 		$pos.css({ '-webkit-transform':'none' })
// 		$rot.css({ '-webkit-transform':'none' })
// 	} else if (Math.abs(deg) == 90) {
// 		$controls.css({ width:'100%' })
// 		setTimeout(function() {
// 			$controls.css({ width:height })
// 			var closeOffset = deg < 0 ? [0, height - 35] : [width - 35, 0]
// 			$close.css({ '-webkit-transform':'translate('+closeOffset[0]+'px, '+closeOffset[1]+'px)' })
// 
// 			var offset = deg < 0 ? [72, -211] : [-212, -211]
// 			$pos.css({ '-webkit-transform':'translate('+offset[0]+'px, '+offset[1]+'px)' })
// 			$rot.css({ '-webkit-transform':'rotate('+deg+'deg)' })
// 		})
// 	}
// })
