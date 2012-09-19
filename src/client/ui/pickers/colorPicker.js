var rgbToHsv = require('client/colors/rgbToHsv')
var hsvToRgb = require('client/colors/hsvToRgb')
var basePicker = require('./basePicker')

var colorLists = [
	['multi-color1'],
	[[15,10,10], [100,90,90], [255,245,245]],
	[[210,0,0],[210,210,0],[100,210,50],[0,0,210],[125,10,210]],
	[[212,69,3],[236,169,31], [79,124,128], [145,161,112], [184,143,170], [171,128,88], [70,130,180]]
]

module.exports = proto(basePicker,
	function(){},
	{
		current: colorLists[0][0],
		className:'colorPicker',
		itemLists:colorLists,
		
		multiColors: {
			'multi-color1':colorLists[2]
		},
		
		renderItem: function(color, isCurrent) {
			var alpha = isCurrent ? 1 : .95
			var diameter = 51
			var styles = {
				width:diameter, height:diameter,
				'border-radius':10
			}
			var content
			if (typeof color == 'string') {
				styles.backgroundImage = 'url("/static/img/colors/'+color+'.png")'
				styles.backgroundSize = diameter+'px '+diameter+'px'
			} else {
				styles.background = rgbaString(color, alpha)
			}
			return div('dot', style(styles), content)
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
			return tags.draggable({
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
				var colors = this.multiColors[color]
				do {
					var color = colors[Math.floor(Math.random() * colors.length)]
				} while (color == this.lastMultiColor)
				this.lastMultiColor = color
				return rgbaString(color, alpha)
			} else {
				return rgbaString(color, alpha)
			}
		},
		
		getPos: function(i, j, num) {
			var quarterCircle = Math.PI / 2
			var expand = 69
			if (!num) { num = 1 }
			var x = Math.cos(j * quarterCircle/num)*expand*i
			var y = -(Math.sin(j * quarterCircle/num)*expand*i + 60)
			return [x, y]
		}
	}
)
function rgbFromPos(hsvBase, pos) {
	var saturationRatio = 1 + (-pos.dx / 100)
	var valueRatio = 1 + (pos.dy / 100)
	var hsv = [hsvBase[0], hsvBase[1] * saturationRatio, hsvBase[2] * valueRatio]
	return hsvToRgb(clipArray(hsv, 0, 1))
}
function getRgb(item) {
	var rgbStr = $(item).find('.dot').css('background-color')
	var parts = rgbStr.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(0\.\d+))?\)$/)
	return [parseInt(parts[1]), parseInt(parts[2]), parseInt(parts[3])]
}
function getHsv(item) {
	return rgbToHsv(getRgb(item))
}
function rgbaString(rgb, alpha) {
	return 'rgba('+map(rgb, function(c) { return Math.round(c) }).concat(alpha||0.8).join(',')+')'
}
function clipArray(arr, min, max) {
	function clip(val) { return Math.max(Math.min(val, max), min) }
	return [clip(arr[0]), clip(arr[1]), clip(arr[2])]
}
