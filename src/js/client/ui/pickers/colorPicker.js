var colors = require('client/colors')
var basePicker = require('./basePicker')

var colorLists = [
	['multi1', 'multi2', 'multi3', 'multi4', 'multi5'],
	// blues
	[[81,214,255], [128,185,230], [0,112,255], [106,202,252], [22,131,25]], // [63,97,183]],
	// greens
	[[179,253,145], [165,233,48], [98,205,9], [98,155,27], [16,73,29]],// [63,140,120], [66,137,56], [6,127,7], [166,212,201]]
	// reds
	[[216,0,0], [133,0,54], [192,0,78], [236,0,96], [255,0,108]], //[224,0,108], [76,27,27]]
	// misc
	[[236,172,68], [242,0,0], [203,121,124], [230,223,216], [129, 228, 164]]
	
	// [[89, 197, 202], [129, 228, 164], [252, 212, 128], [250, 141, 69]],
	// [[110, 33, 81], [39, 118, 184], [185, 163, 133], [20, 16, 50]],
	// [[223, 88, 88], [106, 125, 150], [102, 77, 116], [247, 224, 226]]
	// Old colors
	// [[15,10,10], [100,90,90], [255,245,245]],
	// [[210,0,0],[210,210,0],[100,210,50],[0,0,210],[125,10,210]],
	// [[212,69,3],[236,169,31], [79,124,128], [145,161,112], [184,143,170], [171,128,88], [70,130,180]]
]

module.exports = proto(basePicker,
	function(){},
	{
		current: colorLists[0][0],
		className:'colorPicker',
		itemLists:colorLists,
		
		renderItem: function(color, isCurrent) {
			var alpha = isCurrent ? 1 : .95
			var diameter = 58
			var round = 40
			if (typeof color == 'string') {
				var index = parseInt(color.match(/\w+(\d)/)[1])
				var size = { width:diameter/2, height:diameter/2 }
				return div('dot',
					map(new Array(4), function(_, i) {
						var color = colorLists[i + 1][index - 1]
						var radia = map(new Array(4), function() { return 0 })
						radia[i] = round
						var top = i >= 2 ? diameter / 2 : 0
						var left = i == 1 || i == 2 ? diameter / 2 : 0
						return div(style(size), style({
							background:rgbaString(color, alpha), borderRadius:px(radia),
							position:'absolute', top:top, left:left
						}))
					})
				)
				// styles.backgroundImage = image.background('color-'+color)
				// styles.backgroundSize = diameter+'px '+diameter+'px'
			} else {
				return div('dot', style({
					width:diameter, height:diameter, borderRadius:round, background:rgbaString(color, alpha)
				}))
			}
		},
		
		touchHandler: function(onSelect, item) {
			if (typeof item == 'string') {
				return button(curry(onSelect, item))
			}
			var hsvBase
			var rgb = item
			var maxDelay = this.delay(this.itemLists[0].length, this.itemLists[1].length) + this.transition
			var onDone = function() {
				var resetRgba = rgbaString(item)
				setTimeout(bind(this, function() {
					$(this).find('.dot').css({ 'background-color':resetRgba }) // reset
				}), maxDelay)
				onSelect(rgb)
				rgb = item
			}
			return draggable({
				start:function(pos) {
					hsvBase = getHsv(this)
				},
				move:function(pos) {
					rgb = rgbFromPos(hsvBase, pos)
					$(this).find('.dot').css({ 'background-color':rgbaString(rgb) })
				},
				end:onDone,
				tap:onDone
			})
		},
		
		getColor: function(alpha) {
			var color = this.getCurrent()
			alpha = alpha || 0.8
			if (typeof color == 'string') {
				var index = parseInt(color.match(/\w+(\d)/)[1])
				do {
					color = colorLists[Math.floor(Math.random() * 4 + 1)][index - 1]
				} while (color == this.lastMultiColor)
				this.lastMultiColor = color
				return rgbaString(color, alpha)
			} else {
				return rgbaString(color, alpha)
			}
		},
		
		getPos: function(i, j, num) {
			// return getCirclePos(i, j, num)
			return getGridPos(i, j, num)
		},
		
		getClosedPos: function(i, j) {
			return [0,0]
			var mult = 8
			return [175 - (i * 5 * mult + j * mult), 0]
		}
	}
)

function getGridPos(i, j, num) {
	var expand = 62
	var x = j * expand
	var y = -i * expand - 10 - expand
	return [x, y]
}

function getCirclePos(i, j, num) {
	var quarterCircle = Math.PI / 2
	var expand = 69
	if (!num) { num = 1 }
	var x = Math.cos(j * quarterCircle/num)*expand*i
	var y = -(Math.sin(j * quarterCircle/num)*expand*i + 60)
	return [x, y]
}

function rgbFromPos(hsvBase, pos) {
	var saturationRatio = 1 + (pos.distance.x / 100)
	var valueRatio = 1 + (-pos.distance.y / 100)
	var hsv = [hsvBase[0], hsvBase[1] * saturationRatio, hsvBase[2] * valueRatio]
	return colors.hsvToRgb(clipArray(hsv, 0, 1))
}
function getRgb(item) {
	var rgbStr = $(item).find('.dot').css('background-color')
	var parts = rgbStr.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(0\.\d+))?\)$/)
	return [parseInt(parts[1]), parseInt(parts[2]), parseInt(parts[3])]
}
function getHsv(item) {
	return colors.rgbToHsv(getRgb(item))
}
rgbaString = function(rgb, alpha) {
	return 'rgba('+map(rgb, function(c) { return Math.round(c) }).concat(alpha||0.9).join(',')+')'
}
function clipArray(arr, min, max) {
	function clip(val) { return Math.max(Math.min(val, max), min) }
	return [clip(arr[0]), clip(arr[1]), clip(arr[2])]
}
