var trim = require('std/trim')
var placeholder = 'Say something :)'

var state = {
	points: null,
	color: null,
	ctx: null,
	pen: null
}

module.exports = {
	render: function($viewUi, convo, contact, renderMessage) {
		var $ui = {}
		return function($tag) {
			$tag.append(
				div('composer',
					$ui.surface = $(div('surface')),
					div('tools',
						div('button tool write', 'Write', button(selectText)),
						div('button tool draw', 'Draw', button(selectDraw)),
						div('button tool send', 'Send', button(send))
					)
				)
			)
			state.pen = pens.smoothed
		}
		
		function selectText() {
			$ui.textInput = $(textarea({ placeholder:placeholder }, button(function() {
				$ui.textInput.focus()
			})))
			$ui.textInput.on('focus', function() {
				$viewUi.wrapper
					.css({ marginTop:215 })
					.scrollTop(1)
					.on('scroll', function() {
						if ($viewUi.wrapper.scrollTop() == 0) {
							$viewUi.wrapper.scrollTop(1)
						}
					})
			})
			$ui.textInput.on('blur', function() {
				$viewUi.wrapper
					.css({ marginTop:0 })
					.off('scroll')
			})
			$ui.surface.empty().append(div('writer', $ui.textInput))
			$ui.textInput.focus()
		}
		
		function selectDraw() {
			if ($ui.textInput) { $ui.textInput.blur() }
			
			var w = 304
			var h = 187
			$ui.drawCanvas = $(canvas('canvas', { width:w, height:h }))
			ctx = state.ctx = $ui.drawCanvas[0].getContext('2d')
			ctx.fillStyle = '#fff'
			ctx.fillRect(0, 0, w, h)
			
			$ui.drawCanvas
				.on('touchstart', pencilDown).on('touchmove', pencilMove).on('touchend', pencilUp)
				.on('mousedown', pencilDown).on('mousemove', pencilMove).on('mouseup', pencilUp)
			
			// $(".app").append($ui.drawCanvas)
			$ui.surface.empty().append(div('drawer', $ui.drawCanvas))
			
			function getPoint(e) {
				var point = {
					x:e.originalEvent.pageX - (tags.isTouch ? 8 : $ui.drawCanvas.offset().left),
					y:e.originalEvent.pageY - $ui.drawCanvas.offset().top
				}
				console.log(point.x, point.y, $ui.drawCanvas.offset().top)
				return point
			}
			
			function pencilDown(e) {
				e.preventDefault()
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
		
		function send() {
			var body = trim($ui.textInput.val())
			$ui.textInput.val('')
			if (!body) { return }
			
			var message = {
				toAccountId:convo.withAccountId,
				toFacebookId:contact.facebookId,
				senderAccountId:myAccount.accountId,
				body:body
			}
			
			api.post('messages', message, function(err, res) {
				if (err) { return error(err) }
			})

			loadAccount(convo.withAccountId, function(withAccount) {
				$viewUi.messageList.prepend(renderMessage(withAccount, message))
			})
		}
	}
}

var pens = {
	smoothed: {
		lineWidth: {
			init:5,
			vary:3,
			max:7,
			min:1
		},
		onDown: function(ctx, point) {
			ctx.moveTo(point.x, point.y)
			ctx.beginPath()
			ctx.lineWidth = pens.smoothed.lineWidth.init
			ctx.strokeStyle = rgba()
			state.points = [point]
		},
		onMove: function(ctx, point) {
			var points = state.points
			if (!points) { return }
			var lineWidth = pens.smoothed.lineWidth
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
				console.log(interp.x, interp.y)
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
		}
	},
	zebra: {
		
	}
}

function rgba() {
	var colors = []
	for(var i = 0; i< 3; i++) {
		colors.push(Math.floor(Math.random() * 255))
	}
	// colors.push(0.1)
	return 'rgb('+colors.join(',')+')'
}    
