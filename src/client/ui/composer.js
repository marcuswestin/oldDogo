var trim = require('std/trim')
var placeholder = 'Say something :)'

var state = {
	points: null,
	color: null,
	ctx: null,
	pen: null
}

var currentAccountId
var currentFacebookId
var $currentViewUi
var currentRenderMessage

module.exports = {
	render: function($viewUi, accountId, facebookId, renderMessage) {
		var $ui = {}

		currentAccountId = accountId
		currentFacebookId = facebookId
		$currentViewUi = $viewUi
		currentRenderMessage = renderMessage
		
		return function($tag) {
			$tag.append(
				div('composer',
					$ui.surface = $(div('surface')),
					div('tools',
						div('button tool write', 'Write', button(selectText)),
						div('button tool draw', 'Draw', button(selectDraw)),
						div('button tool send', 'Send', button(onSend))
					)
				)
			)
			state.pen = pens.smooth
		}
		
		function onSend() {
			sendImage()
		}
		
		function selectText(e) {
			bridge.command('composer.showTextInput', { x:0, y:214, width:320, height:40 })
			$ui.surface.empty().append(div('writer'))
		}
		
		function sendImage() {
			var data = $ui.canvas[0].toDataURL('image/png')
			send({ base64Picture:data })
		}
		
		function selectDraw() {
			var width = 320
			var height = 187
			var ratio = window.devicePixelRatio || 1
			// if (ratio < 2) { ratio = 2 }
			$ui.canvas = $(canvas('canvas', { width:width * ratio, height:height * ratio }, style({ height:height, width:width })))
			ctx = state.ctx = $ui.canvas[0].getContext('2d')
			
			ctx.scale(ratio, ratio);
			
			ctx.fillStyle = '#000'
			ctx.fillRect(0, 0, width, height)
			
			$ui.canvas
				.on('touchstart', pencilDown).on('touchmove', pencilMove).on('touchend', pencilUp)
				.on('mousedown', pencilDown).on('mousemove', pencilMove).on('mouseup', pencilUp)
			
			$ui.surface.empty().append(div('drawer',
				div('pens', $.map(pens, function(pen, name) {
					return div('button', name, button(function() { state.pen = pen }))
				})),
				$ui.canvas
			))
			
			function getPoint(e) {
				var point = {
					x:e.originalEvent.pageX - (tags.isTouch ? 8 : $ui.canvas.offset().left),
					y:e.originalEvent.pageY - $ui.canvas.offset().top
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
	}
}

var pens = {
	smooth: {
		onDown: function(ctx, point) {
			ctx.moveTo(point.x, point.y)
			ctx.beginPath()
			ctx.lineWidth = pens.smooth.lineWidth.init
			ctx.strokeStyle = rgba()
			state.points = [point]
		},
		onMove: function(ctx, point) {
			var points = state.points
			if (!points) { return }
			var lineWidth = pens.smooth.lineWidth
			var dw = lineWidth.vary
			ctx.lineWidth += Math.round((Math.random() * dw) - (dw/2 + .3))
			if (ctx.lineWidth < lineWidth.min) {
				ctx.lineWidth = lineWidth.min
			} else if (ctx.lineWidth > lineWidth.max) {
				ctx.lineWidth = lineWidth.max
			}
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
			ctx.lineWidth += Math.round((Math.random() * dw) - (dw/2 + .3))
			if (ctx.lineWidth < 1) ctx.lineWidth = 1
			if (ctx.lineWidth > 50) ctx.lineWidth = 50
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
			var lineWidth = pens.glow.lineWidth
			var dw = lineWidth.vary
			ctx.lineWidth += Math.round((Math.random() * dw) - (dw/2 + .3))
			if (ctx.lineWidth < lineWidth.min) {
				ctx.lineWidth = lineWidth.min
			} else if (ctx.lineWidth > lineWidth.max) {
				ctx.lineWidth = lineWidth.max
			}
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
}

function rgba(alpha) {
	var colors = []
	for(var i = 0; i< 3; i++) {
		colors.push(Math.floor(Math.random() * 255))
	}
	if (alpha) {
		colors.push(alpha)
		return 'rgba('+colors.join(',')+')'
	} else {
		return 'rgb('+colors.join(',')+')'
	}
}

events.on('composer.sendText', function(info) {
	var body = trim(info.text)
	if (!body) { return }
	send({ body:body })
})

function send(params) {
	var message = {
		toAccountId:currentAccountId,
		toFacebookId:currentFacebookId,
		senderAccountId:myAccount.accountId
	}
	
	each(params, function(val, key) { message[key] = val })

	var doDraw = function(message) {
		if (currentAccountId) {
			loadAccountId(currentAccountId, function(withAccount) {
				$currentViewUi.messageList.prepend(currentRenderMessage(withAccount, message))
			})
		} else {
			alert('TODO implement drawing message sent to facebook id')
		}
	}
	
	if (params.body) {
		doDraw(message) // draw text messages right away
	}
	
	api.post('messages', message, function(err, res) {
		if (err) { return error(err) }
		if (!params.body) {
			doDraw(res.message) // draw picture messages when they are ready
		}
	})
}
