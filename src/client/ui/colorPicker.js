
module.exports = function(opts) {
	opts = options(opts, { color:'red' })

	var colorLists = [
		['multi1', 'multi2', 'random'],
		[[255,255,0],[255,165,0],[255,0,255],[255,192,203],[0,255,255]],
		[[212,69,3],[236,169,31], [79,124,128], [145,161,112], [184,143,170], [171,128,88], [70,130,180]]
	]
	
	var multiColors = {
		'multi1':colorLists[1],
		'multi2':colorLists[2],
		'random':[[255, 0, 0], [255, 125, 0], [125, 255, 125], [0, 125, 255], [0, 0, 255]]
	}

	var currentColor = colorLists[0][1]
	
	var renderDot = function(onSelect, color, giveAlpha) {
		var alpha = giveAlpha ? .90 : 1
		var diameter = 40
		var styles = {
			width:diameter, height:diameter,
			'-webkit-transition':'-webkit-transform 0.20s', //'-webkit-transition-delay':delay(i,j)/1000+'s',
			position:'absolute', 'border-radius':25, border:'3px solid #fff', boxShadow:'0 1px 1px #333'
		}
		var content
		if (typeof color == 'string') {
			var canvas = createCanvas(diameter, diameter)
			var ctx = canvas.ctx
			var d2 = diameter/2
			var colors = multiColors[color]
			var rotation = Math.PI*2/(colors.length)
			ctx.translate(d2, d2) // center
			for (var i=0; i<colors.length; i++) {
				ctx.beginPath()
				ctx.fillStyle = getRgba(colors[i], alpha)
				ctx.strokeStyle = '#fff'
				ctx.lineWidth = 1
				ctx.lineTo(0, d2)
				ctx.moveTo(0, 0)
				ctx.arc(0, 0, d2, 0, rotation, false)
				ctx.lineTo(0, Math.sin(d2))
				ctx.moveTo(0, 0)
				ctx.rotate(rotation)
				ctx.closePath()
				ctx.stroke()
				ctx.fill()
			}
			content = canvas.tag
		} else {
			styles.background = getRgba(color, alpha)
		}
		return div('dot', style(styles), content, button(onSelect))
	}
	var out = false
	var quarterCircle = Math.PI / 2
	var expand = 63
	var delay = function(i,j) { return i * 5 + j * 40 }
	var getPos = function(i, j, num, wasOut) { return wasOut
		? [0,0]
		: [Math.cos(j * quarterCircle/num)*expand*i, -Math.sin(j * quarterCircle/num)*expand*i]
	}

	var getRgba = function(color, alpha) {
		return 'rgba('+color.concat(alpha||1).join(',')+')'
	}
	
	var result = function($tag, $ui) {
		$tag.append($ui=$(div('colorPicker', style({ position:'relative' }),
			div('colors', map(colorLists, function(colorList, i) {
				return div('list', map(colorList, function(color, j) {
					return renderDot(curry(selectColor, color), color, true)
				}))
			})),
			div('current', renderDot(toggle, currentColor))
		)))

		function toggle () {
			var wasOut = out
			$ui.find('.colors .list').each(function(i) {
				$(this).find('.dot').each(function(j) {
					var $el = $(this)
					var pos = getPos(i+1, j, colorLists[i].length - 1, wasOut)
					
					setTimeout(function() {
						$el.css('-webkit-transform', 'translate('+Math.round(pos[0])+'px, '+Math.round(pos[1])+'px)')							
					}, delay(i,j))
				})
			})
			out = !out
		}

		function selectColor(color) {
			result.color = color
			$ui.find('.current').empty().append(renderDot(toggle, color))
			toggle()
		}
	}
	result.color = currentColor
	var lastMultiColor
	result.getColor = function(alpha) {
		if (typeof result.color == 'string') {
			var colors = multiColors[result.color]
			do {
				var color = colors[Math.floor(Math.random() * colors.length)]
			} while (color == lastMultiColor)
			lastMultiColor = color
			return getRgba(color, alpha)
		} else {
			return getRgba(result.color, alpha)
		}
	}
	return result
}