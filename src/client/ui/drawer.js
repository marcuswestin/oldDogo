var pickers = require('./pickers')
var pens = require('./pens')
var makeDraw = require('./draw')

module.exports = {
	render:render
}

var state = {
	colorPicker: null,
	pen: null
}

var width = 320
var height = 460
var ratio = window.devicePixelRatio || 1
var canvasSize = { width:width * ratio, height:height * ratio }
var background = '#F4F3EF' //'#424242'

var $ui

var opts

var controlsDuration = 350

function render(_opts) {
	opts = options(_opts, { onHide:null, onSend:null, img:null, message:null })
	
	imageTouched = false
	
	var draw = makeDraw([width, height])
	draw.canvas.className = 'drawCanvas'
	
	var $canvas = $(draw.canvas)
	$canvas.on('touchstart', pencilDown).on('touchmove', pencilMove).on('touchend', pencilUp)
	$canvas.on('mousedown', pencilDown).on('mousemove', pencilMove).on('mouseup', pencilUp)
	
	// Background
	draw.background(background) 
	
	if (opts.img) {
		// TODO Show loading indicator
		var underlyingUrl = opts.img.style.background.match(/url\((.*)\)/)[1]
		if (underlyingUrl.match(/^data/) || !tags.isTouch) {
			doDraw(underlyingUrl)
		} else {
			var asUrl = location.protocol+'//'+location.host+'/url='+encodeURIComponent(underlyingUrl)
			bridge.command('net.cache', { url:underlyingUrl, asUrl:asUrl, override:false }, function(err, res) {
				if (err) { return }
				doDraw(asUrl)
			})
		}
	}
	
	function doDraw(url) {
		var drawImg = new Image()
		drawImg.onload = function() {
			var message = opts.message
			draw.save()
			if (message.pictureWidth > message.pictureHeight) {
				draw
					.rotate(-Math.PI / 2)
					.translate([-canvasSize.height / ratio, 0])
				var outputWidth = Math.min(message.pictureWidth, height) // rotate, then max canvas height
				var outputHeight = Math.min(message.pictureHeight, width)
			} else {
				var outputWidth = Math.min(message.pictureWidth, width) // rotate, then max canvas height
				var outputHeight = Math.min(message.pictureHeight, height)
			}
			draw
				.drawImage(drawImg, [0, 0], [outputWidth, outputHeight])
				.restore()
		}
		drawImg.src = url
	}
	
	
	var controlsTrans = function(name) { return style({ '-webkit-transition':name+' '+controlsDuration/1000+'s' })}
	
	$ui = $(div('draw-composer',
		div('close button', 'X', controlsTrans('-webkit-transform'), style({ bottom:height - 30, left:3 }), button(function() { opts.onHide() })),
		div('controls-pos', controlsTrans('-webkit-transform'),
			div('controls-rot', controlsTrans('-webkit-transform'),
				div('controls', controlsTrans('width'), style({ width:width }),
					div('tools',
						state.colorPicker = pickers.color(),
						state.penPicker = pickers.pen({ background:background, colorPicker:state.colorPicker }),
						div('button clear', 'Clear', button(function() { draw.background(background) })),
						div('button tool send', 'Send', button(sendImage))
					)
				)
			)
		),
		$canvas
	))
	
	return $ui
	
	function createPen(pen) {
		return pen({ colorPicker:state.colorPicker, draw:draw, width:width, height:height })
	}
	
	function getPoint($e) {
		var coords = $e.originalEvent
		if (tags.isTouch) {
			coords = coords.changedTouches[0]
		}
		return [
			coords.pageX - (tags.isTouch ? 0 : $canvas.offset().left),
			coords.pageY - $canvas.offset().top
		]
	}
	
	function pencilDown(e) {
		e.preventDefault()
		var pen = state.penPicker.getItem()
		state.pen = createPen(pen)
		state.pen.handleDown(getPoint(e))
	}

	function pencilMove(e) {
		if (!state.pen) { return }
		imageTouched = true
		e.preventDefault()
		state.pen.handleMove(getPoint(e))
	}

	function pencilUp(e) {
		e.preventDefault()
		state.pen.handleUp(getPoint(e))
		delete state.pen
	}
}

var imageTouched
function sendImage() {
	if (!imageTouched) { return }
	var dim = canvasSize.height // use height (largest dimension) for both w/h to avoid cropping
	
	if (rotationDeg) {
		var canvas = createCanvas('rotateCanvas', width, height, style({ position:'absolute', top:0 }))
		var $canvas = $(canvas.tag)
		$('body').append($canvas)
		var rotateCtx = canvas.ctx
		rotateCtx.save()
		rotateCtx.rotate(Math.PI / 2)
		rotateCtx.translate(0, -canvasSize.height)
		rotateCtx.drawImage($canvas[0], 0, 0)
		rotateCtx.restore()

		var data = $canvas[0].toDataURL('image/png')
		$canvas.remove()

		var picWidth = canvasSize.height
		var picHeight = canvasSize.width
	} else {
		var data = $ui.find('.drawCanvas')[0].toDataURL('image/png')
		var picWidth = canvasSize.width
		var picHeight = canvasSize.height
	}
	
	opts.onSend(data, picWidth, picHeight)
}

var changeWidthTimeout
var rotationDeg
events.on('device.rotated', function(info) {
	if (!$ui) { return }
	var deg = rotationDeg = info.deg
	var $pos = $ui.find('.controls-pos')
	var $rot = $ui.find('.controls-rot')
	var $controls = $ui.find('.controls')
	var $close = $ui.find('.close.button')
	if (Math.abs(deg) == 180) { return }
	clearTimeout(changeWidthTimeout)
	if (deg == 0) {
		$close.css({ '-webkit-transform':'none' })
		$controls.css({ width:width })
		$pos.css({ '-webkit-transform':'none' })
		$rot.css({ '-webkit-transform':'none' })
	} else if (Math.abs(deg) == 90) {
		$controls.css({ width:'100%' })
		setTimeout(function() {
			$controls.css({ width:height })
			var closeOffset = deg < 0 ? [0, height - 35] : [width - 35, 0]
			$close.css({ '-webkit-transform':'translate('+closeOffset[0]+'px, '+closeOffset[1]+'px)' })

			var offset = deg < 0 ? [72, 211] : [-212, 211]
			$pos.css({ '-webkit-transform':'translate('+offset[0]+'px, '+-offset[1]+'px)' })
			$rot.css({ '-webkit-transform':'rotate('+deg+'deg)' })
		})
	}
})
