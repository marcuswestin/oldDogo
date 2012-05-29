
module.exports = function(opts) {
	opts = options(opts, { color:'red' })

	var current
	var colors = [
		[[255,0,0], currentColor='multi', [0,0,255]],
		[[255,255,0],[255,165,0],[255,0,255],[255,192,203],[0,255,255]],
		[[212,69,3],[236,169,31], [79,124,128], [145,161,112], [184,143,170], [171,128,88], [70,130,180]]
	]

	var dotStyles = function(color, giveAlpha) {
		var diameter = 40
		var styles = {
			width:diameter, height:diameter,
			'-webkit-transition':'-webkit-transform 0.20s', //'-webkit-transition-delay':delay(i,j)/1000+'s',
			position:'absolute', 'border-radius':25, border:'3px solid #fff', boxShadow:'0 1px 1px #333'
		}
		if (color == 'multi') {
			styles.background = 'gold'
		} else {
			styles.background = getRgba(color, giveAlpha ? .90 : 1)
		}
		return styles
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
			div('colors', map(colors, function(colorList, i) {
				return div('list', map(colorList, function(color, j) {
					return div('dot', style(dotStyles(color, true, i, j)), button(curry(selectColor, i, j)))
				}))
			})),
			div('current', style(dotStyles(currentColor, false)), button(toggle))
		)))

		function toggle () {
			var wasOut = out
			$ui.find('.colors .list').each(function(i) {
				$(this).find('.dot').each(function(j) {
					var $el = $(this)
					var pos = getPos(i+1, j, colors[i].length - 1, wasOut)
					
					setTimeout(function() {
						$el.css('-webkit-transform', 'translate('+Math.round(pos[0])+'px, '+Math.round(pos[1])+'px)')							
					}, delay(i,j))
				})
			})
			out = !out
		}

		function selectColor(i, j) {
			result.color = colors[i][j]
			$ui.find('.current').css(dotStyles(result.color))
			toggle()
		}
	}
	result.color = currentColor
	result.getColor = function(alpha) {
		if (result.color == 'multi') {
			var colors = []
			for(var i = 0; i< 3; i++) {
				colors.push(Math.floor(Math.random() * 255))
			}
			return getRgba(colors, alpha)
		} else {
			return getRgba(result.color, alpha)
		}
	}
	return result
}