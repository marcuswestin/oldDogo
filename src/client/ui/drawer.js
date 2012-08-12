var pickers = require('./pickers')
var pens = require('./pens')
var paint = require('./paint')
var pictures = require('../../data/pictures')

module.exports = {
	render:render,
	remove:remove
}

var state = {
	colorPicker: null,
	pen: null
}

var width
var height
var ratio
var canvasSize
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

function render(_opts) {
	
	width = viewport.width()
	height = viewport.height()
	ratio = window.devicePixelRatio || 1
	canvasSize = { width:width * ratio, height:height * ratio }
	
	opts = options(_opts, { onHide:null, onSend:null, img:null, message:null })
	
	var controlsTrans = function(name) { return style({ '-webkit-transition':name+' '+controlsDuration/1000+'s' })}
	
	$ui = $(div('draw-composer',
		div('loading', 'Loading...'),
		div('close button', 'X', controlsTrans('-webkit-transform'), style({ bottom:height - 30, left:3 }), button(function() { opts.onHide() })),
		div('controls-pos', controlsTrans('-webkit-transform'),
			div('controls-rot', controlsTrans('-webkit-transform'),
				div('controls', controlsTrans('width'), style({ width:width }),
					div('tools',
						state.colorPicker = pickers.color(),
						state.penPicker = pickers.pen({ background:background, colorPicker:state.colorPicker }),
						div('right',
							div('button undo', 'Undo', button(undoDraw)),
							div('button clear', 'Clear', button(clearFg)),
							div('button tool send', 'Send', button(sendImage))
						)
					)
				)
			)
		)
	))
	
	if (opts.img) {
		// TODO this call is way overloaded
		loadBackgroundImage({ mediaId:opts.img.mediaId, style:opts.img.style, width:opts.message.pictureWidth, height:opts.message.pictureHeight, pictureSecret:opts.message.pictureSecret, conversationId:opts.message.conversationId })
	} else {
		loadBackgroundImage({ backgroundPath:'img/background/exclusive_paper.jpg', width:640, height:960 })
	}
	
	p = paint([width, height])
	$ui.append($paint = $(p.el))
	if (tags.isTouch) {
		$paint.on('touchstart', pencilDown).on('touchmove', pencilMove).on('touchend', pencilUp)
	} else {
		$paint.on('mousedown', pencilDown).on('mousemove', pencilMove).on('mouseup', pencilUp)
	}
	
	return $ui
	
	function clearFg() {
		p.clearDrawn()
	}
	
	function undoDraw() {
		p.popLayer()
	}
	
	function loadBackgroundImage(opts) {
		if (opts.mediaId) {
			doDraw('/blowtorch/media/'+opts.mediaId+'.jpg', opts.width, opts.height)
		} else if (opts.backgroundPath) {
			doDraw('/blowtorch/'+opts.backgroundPath, opts.width, opts.height)
		} else if (opts.pictureSecret) {
			// TODO Show loading indicator
			var pictureUrl = pictures.url(opts.conversationId, opts.pictureSecret)
			var asUrl = location.protocol+'//'+location.host+'/local_cache?pictureSecret='+opts.pictureSecret
			bridge.command('net.cache', { url:pictureUrl, asUrl:asUrl, override:false }, function(err, res) {
				if (err) { return }
				doDraw(asUrl, opts.width, opts.height)
			})
		} else if (opts.style) {
			var underlyingUrl = opts.style.background.match(/url\((.*)\)/)[1]
			if (underlyingUrl.match(/^data/) || !tags.isTouch) {
				doDraw(underlyingUrl, opts.width, opts.height)
			}
		}
	}
	
	function doDraw(url, picWidth, picHeight) {
		var drawImg = new Image()
		drawImg.onload = function() {
			console.log('doDraw: drawImg.onload')
			var message = opts.message
			var rotate = 0
			var translate = [0, 0]
			var size
			
			var target = [width, height]
			if (picWidth > picHeight) {
				target = [height, width] // rotate
			}
			
			var dWidth = picWidth - target[0]
			var dHeight = picHeight - target[1]
			console.log('doDraw: calculate size')
			if (dWidth > 0 && dHeight > 0) {
				var resizeRatio = Math.max(target[1] / picHeight, target[0] / picWidth) // scale by as little as possible to fit the image precicesly into the viewport
				size = [picWidth * resizeRatio, picHeight * resizeRatio]
			} else {
				size = [picWidth, picHeight]
			}
			
			console.log('doDraw: resize + rotate')
			if (size[0] > size[1]) {
				rotate = -Math.PI / 2
				translate = [-canvasSize.height / ratio, 0]
			} else {
				rotate = 0
				translate = [0, 0]
			}
			
			console.log('doDraw: draw background', !!p)
			p.withBackground(function(bg) {
				var center = [(target[0] - size[0]) / 2, (target[1] - size[1]) / 2]
				bg.save()
					.rotate(rotate)
					.translate(translate)
					.translate(center)
					.drawImage(drawImg, [0, 0], size)
					.restore()
			})
			console.log('doDraw: draw done')
			$ui.find('.loading').remove()
		}
		drawImg.src = url
	}
	
	function createPen(pen) {
		return pen.create({ colorPicker:state.colorPicker, paint:p, width:width, height:height })
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
		p.pushLayer()
		var pen = state.penPicker.getCurrent()
		state.pen = createPen(pen)
		state.pen.handleDown(getPoint(e))
	}

	function pencilMove(e) {
		e.preventDefault()
		if (!state.pen) { return }
		state.pen.handleMove(getPoint(e))
	}

	function pencilUp(e) {
		e.preventDefault()
		if (!state.pen) { return }
		state.pen.handleUp(getPoint(e))
		delete state.pen
	}
}

function sendImage() {
	if (rotationDeg) {
		var rotated = paint([canvasSize.height, canvasSize.width])
		var direction = rotationDeg < 0 ? 1 : -1

		rotated
			.save()
			.rotate(direction * Math.PI / 2)
			.translate(direction == 1 ? [0, -canvasSize.height * direction] : [-canvasSize.width, 0])
			.drawImage(p.snapshot(), [0, 0], [canvasSize.width, canvasSize.height])
			.restore()
		
		var data = rotated.snapshot().toDataURL('image/jpg')
		var picWidth = canvasSize.height
		var picHeight = canvasSize.width
	} else {
		var data = p.snapshot().toDataURL('image/jpg')
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

			var offset = deg < 0 ? [62, -221] : [-222, -221]
			$pos.css({ '-webkit-transform':'translate('+offset[0]+'px, '+offset[1]+'px)' })
			$rot.css({ '-webkit-transform':'rotate('+deg+'deg)' })
		})
	}
})
