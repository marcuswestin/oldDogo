var colorPicker = require('./colorPicker')

module.exports = {
	render:render
}

var state = {
	points: null,
	color: null,
	ctx: null,
	pen: null
}

var width = 320
var height = 460
var ratio = window.devicePixelRatio || 1
var canvasSize = { width:width * ratio, height:height * ratio }

var SCREEN_WIDTH = width; // REMOVE
var SCREEN_HEIGHT = height; // REMOVE
var BRUSH_SIZE = 2 // REMOVE
var COLOR = [250, 250, 250] // REMOVE
var BRUSH_PRESSURE = 1
var BACKGROUND_COLOR = [0, 0, 0]

var $ui

var opts

var controlsDuration = 350

function render(_opts) {
	opts = options(_opts, { onHide:null, onSend:null, img:null, message:null })
	
	state.pen = pens.smooth
	
	imageTouched = false
	// if (ratio < 2) { ratio = 2 }
	
	
	var $canvas = $(canvas('canvas', canvasSize, style({ height:height, width:width })))
	$canvas.on('touchstart', pencilDown).on('touchmove', pencilMove).on('touchend', pencilUp)
	$canvas.on('mousedown', pencilDown).on('mousemove', pencilMove).on('mouseup', pencilUp)
	ctx = state.ctx = $canvas[0].getContext('2d')

	ctx.scale(ratio, ratio);
	
	ctx.fillStyle = '#F4F3EF' //'#424242'
	ctx.fillRect(0, 0, width, height)

	if (opts.img) {
		var doDraw = function(drawImg) {
			ctx.save()
			var message = opts.message
			if (message.pictureWidth > message.pictureHeight) {
				ctx.rotate(-Math.PI / 2)
				ctx.translate(-canvasSize.height / ratio, 0)
				var outputWidth = Math.min(message.pictureWidth, height) // rotate, then max canvas height
				var outputHeight = Math.min(message.pictureHeight, width)
				ctx.drawImage(drawImg, 0, 0, outputWidth, outputHeight)
			} else {
				var outputWidth = Math.min(message.pictureWidth, width) // rotate, then max canvas height
				var outputHeight = Math.min(message.pictureHeight, height)
				ctx.drawImage(drawImg, 0, 0, outputWidth, outputHeight)
			}
			ctx.restore()
		}
		var underlyingUrlMatch = opts.img.style.background.match(/url\((.*)\)/)
		if (!underlyingUrlMatch) { return }
		var underlyingUrl = underlyingUrlMatch[1]
		if (underlyingUrl.match(/^data/)) {
			var loadImg = new Image()
			loadImg.onload = function() { doDraw(loadImg) }
			loadImg.src = underlyingUrl
		} else if (!tags.isTouch) {
			var loadImg = new Image()
			loadImg.onload = function() { doDraw(loadImg) }
			loadImg.src = underlyingUrl
		} else {
			var asUrl = location.protocol+'//'+location.host+'/url='+encodeURIComponent(underlyingUrl)
			bridge.command('net.cache', { url:underlyingUrl, asUrl:asUrl, override:false }, function(err, res) {
				if (err) { return }
				var loadImg = new Image()
				loadImg.onload = function() { doDraw(loadImg) }
				loadImg.src = asUrl
			})
		}
	}
	
	var controlsTrans = function(name) { return style({ '-webkit-transition':name+' '+controlsDuration/1000+'s' })}
	
	return $ui = $(div('draw-composer',
		div('close button', 'X', controlsTrans('-webkit-transform'), style({ bottom:height - 30, left:3 }), button(function() { opts.onHide() })),
		div('controls-pos', controlsTrans('-webkit-transform'),
			div('controls-rot', controlsTrans('-webkit-transform'),
				div('controls', controlsTrans('width'),
					state.colorPicker = colorPicker({ color:'steelblue' }),
					div('tools',
						$.map(pens, function(pen, name) {
							return div('button', name, button(function() { state.pen = pen }))
						}),
						// div('button clear', 'Clear', button(function() { alert("MAKE CLEAR") })),
						div('button tool send', 'Send', button(sendImage))
					)
				)
			)
		),
		$canvas
	))
	
	function getPoint(e) {
		var point = {
			x:e.originalEvent.pageX - (tags.isTouch ? 8 : $canvas.offset().left),
			y:e.originalEvent.pageY - $canvas.offset().top
		}
		return point
	}
	
	function pencilDown(e) {
		e.preventDefault()
		ctx.globalCompositeOperation = 'source-over'
		state.pen.onDown(ctx, getPoint(e))
		// ctx.lineCap = 'round'
		// ctx.lineJoin = 'round'
	}

	function pencilMove(e) {
		imageTouched = true
		e.preventDefault()
		state.pen.onMove(ctx, getPoint(e))
		// ctx.beginPath()
		// ctx.moveTo(points[0].x, points[0].y)
		// ctx.lineTo(point.x , point.y )
		// ctx.strokeStyle = rgba()
		// ctx.stroke()
	}

	function pencilUp(e) {
		e.preventDefault()
		state.pen.onUp(ctx, getPoint(e))
	}
}

var imageTouched
function sendImage() {
	if (!imageTouched) { return }
	var dim = canvasSize.height // use height for both to avoid cropping
	$('body').append(canvas('rotate', { width:canvasSize.height, height:canvasSize.width }, style({ position:'absolute', top:0 })))
	
	if (rotationDeg) {
		var $rotateCanvas = $('body canvas.rotate')
		var rotateCtx = $rotateCanvas[0].getContext('2d')
		rotateCtx.save()
		rotateCtx.rotate(Math.PI / 2)
		rotateCtx.translate(0, -canvasSize.height)
		rotateCtx.drawImage($ui.find('canvas')[0], 0, 0)
		rotateCtx.restore()

		var data = $rotateCanvas[0].toDataURL('image/png')
		$rotateCanvas.remove()

		var picWidth = canvasSize.height
		var picHeight = canvasSize.width
	} else {
		var data = $ui.find('canvas')[0].toDataURL('image/png')
		var picWidth = canvasSize.width
		var picHeight = canvasSize.height
	}
	
	opts.onSend(data, picWidth, picHeight)
}

var pens = {
	smooth: {
		onDown: function(ctx, point) {
			ctx.moveTo(point.x, point.y)
			ctx.beginPath()
			ctx.lineWidth = pens.smooth.lineWidth.init
			ctx.fillStyle = ctx.strokeStyle = rgba()
			state.points = [point]
		},
		onMove: function(ctx, point) {
			var points = state.points
			if (!points) { return }
			var lineWidth = pens.smooth.lineWidth
			var dw = lineWidth.vary
			// ctx.lineWidth += Math.round((Math.random() * dw) - (dw/2 + .3))
			// if (ctx.lineWidth < lineWidth.min) {
			// 	ctx.lineWidth = lineWidth.min
			// } else if (ctx.lineWidth > lineWidth.max) {
			// 	ctx.lineWidth = lineWidth.max
			// }
			points.push(point)
			
			if (points.length > 2) {
				var pN2 = points[points.length - 3]
				var pN1 = points[points.length - 2]
				var interp = { x:(pN2.x + pN1.x)/2, y:(pN2.y + pN1.y)/2 }
				ctx.quadraticCurveTo(pN2.x, pN2.y, interp.x, interp.y)
				ctx.stroke()
			}
		},
		onUp: function(ctx, point) {
			var points = state.points
			state.points = null
			
			points.push(point)
			if (points.length == 2) {
				ctx.arc(points[0].x, points[0].y, 5, 0, Math.PI*2, true)
				ctx.closePath()
				ctx.fill()
			} else if (points.length > 2) {
				// curve through the last two points
				var pN0 = points[points.length - 1]
				var pN1 = points[points.length - 2]
				ctx.quadraticCurveTo(pN0.x, pN0.y, pN1.x, pN1.y)
			}
		},
		lineWidth: {
			init:5,
			vary:3,
			max:7,
			min:1
		}
	},
	zebra: {
		onDown: function(ctx, point) {
			state.points = [point]
			ctx.moveTo(point.x, point.y)
			ctx.strokeStyle = rgba()
			ctx.lineWidth = state.lineWidth
		},
		onMove: function(ctx, point) {
			var points = state.points
			if (!points) { return }
			points.push(point)
			var dw = 10
			ctx.beginPath()
			// ctx.lineWidth += Math.round((Math.random() * dw) - (dw/2 + .3))
			// if (ctx.lineWidth < 1) ctx.lineWidth = 1
			// if (ctx.lineWidth > 50) ctx.lineWidth = 50
			if (points.length > 2) {
				var pN2 = points[points.length - 3]
				var pN1 = points[points.length - 2]
				var interp = { x:(pN2.x + pN1.x)/2, y:(pN2.y + pN1.y)/2 }
				ctx.quadraticCurveTo(pN2.x, pN2.y, interp.x, interp.y)
				ctx.stroke()
			}
		},
		onUp: function(ctx, point) {
			var points = state.points
			if (!points) { return }
			points.push(point)
			state.points = null
			
			if (points && points.length > 1) {
				// curve through the last two points
				var pN0 = points[points.length - 1]
				var pN1 = points[points.length - 2]
				ctx.quadraticCurveTo(pN0.x, pN0.y, pN1.x, pN1.y)
			}
		}
	},
	glow: {
		onDown: function(ctx, point) {
			ctx.moveTo(point.x, point.y)
			ctx.beginPath()
			ctx.lineWidth = pens.glow.lineWidth.init
			ctx.strokeStyle = rgba(.1)
			ctx.globalCompositeOperation = 'lighter'
			state.points = [point]
		},
		onMove: function(ctx, point) {
			var points = state.points
			if (!points) { return }
			// var lineWidth = pens.glow.lineWidth
			// var dw = lineWidth.vary
			// ctx.lineWidth += Math.round((Math.random() * dw) - (dw/2 + .3))
			// if (ctx.lineWidth < lineWidth.min) {
			// 	ctx.lineWidth = lineWidth.min
			// } else if (ctx.lineWidth > lineWidth.max) {
			// 	ctx.lineWidth = lineWidth.max
			// }
			points.push(point)
			
			if (points.length > 2) {
				var pN2 = points[points.length - 3]
				var pN1 = points[points.length - 2]
				var interp = { x:(pN2.x + pN1.x)/2, y:(pN2.y + pN1.y)/2 }
				ctx.quadraticCurveTo(pN2.x, pN2.y, interp.x, interp.y)
				ctx.stroke()
			}
		},
		onUp: function(ctx, point) {
			var points = state.points
			state.points = null
			
			points.push(point)
			if (points && points.length > 1) {
				// curve through the last two points
				var pN0 = points[points.length - 1]
				var pN1 = points[points.length - 2]
				ctx.quadraticCurveTo(pN0.x, pN0.y, pN1.x, pN1.y)
			}
		},
		lineWidth: {
			init:10,
			vary:5,
			max:20,
			min:3
		}
	}
	// ribbon: {
	// 	onDown: function(ctx, point) {
	// 		state.brushColor = "rgba(255,255,255,0.8)"//rgba(.3)
	// 		state.ribbonBrush = new ribbon(ctx)
	// 		state.ribbonBrush.strokeStart(point.x, point.y)
	// 	},
	// 	onMove: function(ctx, point) {
	// 		if (!state.ribbonBrush) { return }
	// 		state.ribbonBrush.stroke(point.x, point.y);
	// 	},
	// 	onUp: function(ctx, point) {
	// 		state.ribbonBrush.destroy();
	// 	}
	// }
}

function rgba(alpha) {
	// console.log("HERE ", state.colorPicker.color)
	return state.colorPicker.getColor()
	// var colors = []
	// for(var i = 0; i< 3; i++) {
	// 	colors.push(Math.floor(Math.random() * 255))
	// }
	// if (alpha) {
	// 	colors.push(alpha)
	// 	return 'rgba('+colors.join(',')+')'
	// } else {
	// 	return 'rgb('+colors.join(',')+')'
	// }
}





function ribbon( context ) { this.init( context ) }

ribbon.prototype = {
    context: null,
    mouseX: null,
    mouseY: null,
    painters: null,
    interval: null,
    init: function( context ) {
        var scope = this;
        this.context = context;
        // this.context.globalCompositeOperation = 'source-over';
        this.mouseX = SCREEN_WIDTH / 2;
        this.mouseY = SCREEN_HEIGHT / 2;
        this.painters = new Array();
        for (var i = 0; i < 50; i++) {
            this.painters.push({ dx: SCREEN_WIDTH / 2, dy: SCREEN_HEIGHT / 2, ax: 0, ay: 0, div: 0.1, ease: Math.random() * 0.1 + 0.5});
        }
        this.interval = setInterval( bind(this, update), 1000/30 );
        function update()
        {
            var i;
            this.context.lineWidth = BRUSH_SIZE;            
            this.context.strokeStyle = state.brushColor//rgba()//"rgba(" + COLOR[0] + ", " + COLOR[1] + ", " + COLOR[2] + ", " + 0.05 * BRUSH_PRESSURE + ")";
            for (i = 0; i < scope.painters.length; i++)
            {
                scope.context.beginPath();
                scope.context.moveTo(scope.painters[i].dx, scope.painters[i].dy);        
                scope.painters[i].dx -= scope.painters[i].ax = (scope.painters[i].ax + (scope.painters[i].dx - scope.mouseX) * scope.painters[i].div) * scope.painters[i].ease;
                scope.painters[i].dy -= scope.painters[i].ay = (scope.painters[i].ay + (scope.painters[i].dy - scope.mouseY) * scope.painters[i].div) * scope.painters[i].ease;
                scope.context.lineTo(scope.painters[i].dx, scope.painters[i].dy);
                scope.context.stroke();
            }
        }
    },
    destroy: function() {
        clearInterval(this.interval);
    },
    strokeStart: function( mouseX, mouseY ) {
        this.mouseX = mouseX
        this.mouseY = mouseY
        for (var i = 0; i < this.painters.length; i++) {
            this.painters[i].dx = mouseX;
            this.painters[i].dy = mouseY;
        }
    },
    stroke: function( mouseX, mouseY ) {
        this.mouseX = mouseX;
        this.mouseY = mouseY;
    }
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
		changeWidthTimeout=setTimeout(function() {
			$controls.css({ width:'100%' })
		}, controlsDuration)
	} else if (Math.abs(deg) == 90) {
		$controls.css({ width:height })
		var closeOffset = deg < 0 ? [0, height - 35] : [width - 35, 0]
		$close.css({ '-webkit-transform':'translate('+closeOffset[0]+'px, '+closeOffset[1]+'px)' })
		
		var offset = deg < 0 ? [68, 208] : [-208, 208]
		$pos.css({ '-webkit-transform':'translate('+offset[0]+'px, '+-offset[1]+'px)' })
		$rot.css({ '-webkit-transform':'rotate('+deg+'deg)' })
	}
})
