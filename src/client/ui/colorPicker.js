
module.exports = function(opts) {
	opts = options(opts, { color:'red' })

	var colors = [
		['red','green','blue'],
		['yellow','orange','magenta','pink','cyan'],
		['#D44503', '#ECA91F', '#4F7C80', '#91A170', '#B88FAA', '#AB8058', 'steelblue']
	]

	var dotStyle = function(color, i, j) { return style({ width:40, height:40, background:color,
		'-webkit-transition':'-webkit-transform 0.20s', //'-webkit-transition-delay':delay(i,j)/1000+'s',
		position:'absolute', 'border-radius':25, border:'3px solid #fff', boxShadow:'0 1px 1px #333' })}
	var out = false
	var quarterCircle = Math.PI / 2
	var expand = 63
	var delay = function(i,j) { return i * 5 + j * 40 }
	var getPos = function(i, j, num, wasOut) { return wasOut
		? [0,0]
		: [Math.cos(j * quarterCircle/num)*expand*i, -Math.sin(j * quarterCircle/num)*expand*i]
	}

	var result = function($tag, $ui) {
		$tag.append($ui=$(div('colorPicker', style({ position:'relative' }),
			div('colors', map(colors, function(colorList, i) {
				return div('list', map(colorList, function(color, j) {
					return div('dot', dotStyle(color, i, j), button(curry(selectColor, i, j)))
				}))
			})),
			div('current', dotStyle(opts.color), button(toggle))
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
			$ui.find('.current').css({ 'background':result.color })
			toggle()
		}
	}
	result.color = opts.color
	result.getColor = function() { return result.color }
	return result
}