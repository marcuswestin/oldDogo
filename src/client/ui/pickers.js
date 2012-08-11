var currentPicker
var zIndex = 1
var rgbToHsv = require('colors/rgbToHsv')
var hsvToRgb = require('colors/hsvToRgb')

var picker = {
	getCurrent:function() { return this.current },
	isOpen:false,
	toggle:function() {
		var wasOpen = this.isOpen
		if (currentPicker && currentPicker != this && currentPicker.isOpen) {
			var picker = currentPicker
			currentPicker = null
			picker.toggle()
		}
		currentPicker = this
		var self = this
		this.$ui.css({ 'z-index':zIndex++ }).find('.list').each(function(i) {
			$(this).find('.item').each(function(j) {
				var $el = $(this)
				var pos = wasOpen ? [0,0] : self.getPos(i, j, self.itemLists[i].length - 1)
				
				if (wasOpen) { self.onClose(i,j,$el) }
				else { self.onOpen(i,j,$el) }
				
				// setTimeout(function() {
					$el.css('-webkit-transform', 'translate('+Math.round(pos[0])+'px, '+Math.round(pos[1])+'px)')
				// }, self.delay(i,j))
			})
		})
		this.isOpen = !this.isOpen
	},
	onClose:function(i,j){},
	onOpen:function(i,j){},
	renderTag: function($tag) {
		this.$ui=$(div('picker '+this.className,
			div('lists'),
			div('current', this._renderItem(this.current, true, bind(this, this.toggle)))
		))
		this.renderLists()
		return this.$ui
	},
	_renderItem:function(item, isCurrent, onSelect) {
		var touchHandler = isCurrent ? button(curry(onSelect, item)) : this.touchHandler(onSelect, item)
		return div('item', this.renderItem(isCurrent ? this.current : item, isCurrent), touchHandler, style({
			'-webkit-transition':'-webkit-transform 0.20s',
			position:'absolute'
		}))
	},
	renderLists:function() {
		var selectItem = bind(this, function(payload) {
			this.current = payload
			this.$ui.find('.current').empty().append(this._renderItem(payload, true, selectItem))
			this.toggle()
		})
		
		this.$ui.find('.lists').empty().append(div(map(this.itemLists, this, function renderList(list, i) {
			return div('list', map(list, this, function renderListItem(payload, j) {
				return this._renderItem(payload, false, selectItem)
			}))
		})))
	},
	touchHandler:function(onSelect, item) {
		return button(curry(onSelect, item))
	},
	delay:function(i,j) {
		return i * 5 + j * 40
	}
}

var colorLists = [
	['multi-color1'],
	[[15,10,10], [100,90,90], [255,245,245]],
	[[210,0,0],[210,210,0],[100,210,50],[0,0,210],[125,10,210]],
	[[212,69,3],[236,169,31], [79,124,128], [145,161,112], [184,143,170], [171,128,88], [70,130,180]]
]

var colorPicker = proto(picker,
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
			var diameter = 50
			var styles = {
				width:diameter, height:diameter,
				'border-radius':35
			}
			var content
			if (typeof color == 'string') {
				styles.backgroundImage = 'url("/blowtorch/img/colors/'+color+'.png")'
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
			var onDone = function() {
				$(this).find('.dot').css({ 'background-color':rgbaString(item) }) // reset
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
			var expand = 73
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

var pens = require('./pens')
var penPicker = proto(picker,
	function(opts) {
		this.opts = opts
	},
	{
		current: pens.list[0],
		className:'penPicker',
		closeSize:[48,48],
		openSize:[85,85],
		itemLists:[pens.list.slice(0,3), pens.list.slice(3, 6)],
		renderItem:function(pen, isCurrent) {
			var styles = {
				width:this.closeSize[0], height:this.closeSize[1], overflow:'hidden', display:'inline-block', margin:'0 4px 0 0',
				'-webkit-transition-property': 'width, height',
				'-webkit-transition-duration': '0.20s',
				// '-webkit-transition-timing-function': 'linear',
				border:'2px solid #433', borderRadius:4
			}
			return img('pen', style(styles), { src:'/blowtorch/img/pens/'+(pen.name)+'.png' })
		},
		getPos:function(i, j, num) {
			var w = this.openSize[0] + 10
			var h = this.openSize[1] + 10
			return [j * w - 37, -h * (i + 1)]
		},
		onOpen:function(i,j,$el) {
			$el.find('.pen').css({ width:this.openSize[0], height:this.openSize[1] })
		},
		onClose:function(i,j,$el) {
			$el.find('.pen').css({ width:this.closeSize[0], height:this.closeSize[1] })
		}
	}
)

module.exports = {
	color:colorPicker,
	pen:penPicker
}

