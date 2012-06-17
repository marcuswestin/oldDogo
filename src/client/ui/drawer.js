var pickers = require('./pickers')
var pens = require('./pens')
var paint = require('./paint')

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

var p

function render(_opts) {
	opts = options(_opts, { onHide:null, onSend:null, img:null, message:null })
	
	imageTouched = false
	
	p = paint([width, height])
	
	var $paint = $(p.el)
	$paint.on('touchstart', pencilDown).on('touchmove', pencilMove).on('touchend', pencilUp)
	$paint.on('mousedown', pencilDown).on('mousemove', pencilMove).on('mouseup', pencilUp)
	
	// Background
	p.withBackground(function(bg) {
		bg.fillAll(background)
	})
	
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
			p.save()
			if (message.pictureWidth > message.pictureHeight) {
				p
					.rotate(-Math.PI / 2)
					.translate([-canvasSize.height / ratio, 0])
				var outputWidth = Math.min(message.pictureWidth, height) // rotate, then max canvas height
				var outputHeight = Math.min(message.pictureHeight, width)
			} else {
				var outputWidth = Math.min(message.pictureWidth, width) // rotate, then max canvas height
				var outputHeight = Math.min(message.pictureHeight, height)
			}
			p
				.drawImage(drawImg, [0, 0], [outputWidth, outputHeight])
				.restore()
		}
		drawImg.src = url
	}
	
	
	var controlsTrans = function(name) { return style({ '-webkit-transition':name+' '+controlsDuration/1000+'s' })}
	
	$ui = $(div('draw-composer',
		$paint,
		div('close button', 'X', controlsTrans('-webkit-transform'), style({ bottom:height - 30, left:3 }), button(function() { opts.onHide() })),
		div('controls-pos', controlsTrans('-webkit-transform'),
			div('controls-rot', controlsTrans('-webkit-transform'),
				div('controls', controlsTrans('width'), style({ width:width }),
					div('tools',
						state.colorPicker = pickers.color(),
						state.penPicker = pickers.pen({ background:background, colorPicker:state.colorPicker }),
						div('right',
							div('button clear', 'Clear', button(function() { draw.background(background) })),
							div('button tool send', 'Send', button(sendImage))
						)
					)
				)
			)
		)
	))
	
	return $ui
	
	function createPen(pen) {
		return pen({ colorPicker:state.colorPicker, paint:p, width:width, height:height })
	}
	
	function getPoint($e) {
		var coords = $e.originalEvent
		if (tags.isTouch) {
			coords = coords.changedTouches[0]
		}
		return [
			coords.pageX - (tags.isTouch ? 0 : $paint.offset().left),
			coords.pageY - $paint.offset().top
		]
	}
	
	function pencilDown(e) {
		e.preventDefault()
		var pen = state.penPicker.getItem()
		state.pen = createPen(pen)
		state.pen.handleDown(getPoint(e))
	}

	function pencilMove(e) {
		e.preventDefault()
		if (!state.pen) { return }
		imageTouched = true
		state.pen.handleMove(getPoint(e))
	}

	function pencilUp(e) {
		e.preventDefault()
		if (!state.pen) { return }
		state.pen.handleUp(getPoint(e))
		delete state.pen
	}
}

var imageTouched
function sendImage() {
	if (!imageTouched) { return }
	
	if (rotationDeg) {
		var rotated = paint([canvasSize.height, canvasSize.width])
		var direction = rotationDeg < 0 ? 1 : -1

		rotated
			.save()
			.rotate(direction * Math.PI / 2)
			.translate(direction == 1 ? [0, -canvasSize.height * direction] : [-canvasSize.width, 0])
			.drawImage(p.snapshot(), [0, 0], [canvasSize.width, canvasSize.height])
			.restore()
		
		var data = rotated.snapshot().toDataURL('image/png')
		var picWidth = canvasSize.height
		var picHeight = canvasSize.width
	} else {
		var data = p.snapshot().toDataURL('image/png')
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
