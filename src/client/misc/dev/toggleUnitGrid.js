module.exports = toggleUnitGrid

var unitGridShowing = false
function toggleUnitGrid() {
	if (unitGridShowing) {
		$('#unitGrid').remove()
	} else {
		var unit2 = unit * 2
		var numX = viewport.width() / unit2 - 1
		var numY = viewport.height() / unit2 - 1
		$('#viewport').append(div({ id:'unitGrid' }, style(absolute(0,0)),
			map(new Array(numX), function(_, x) {
				var width = ((x + 1) % 10 == 0 ? 2 : 1)
				return div(style({ width:width, background:'red', opacity:.3, height:viewport.height() }, absolute(x*unit2 + unit2, 0)))
			}),
			map(new Array(numY), function(_, y) {
				var height = ((y + 1) % 10 == 0 ? 2 : 1)
				return div(style({ width:viewport.width(), background:'red', opacity:.3, height:height }, absolute(0, y*unit2 + unit2)))
			})
		))
	}
	unitGridShowing = !unitGridShowing
}
