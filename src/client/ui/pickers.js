var currentPicker
var zIndex = 1

var picker = {
	current: [0,0],
	getItem:function(index) {
		if (!index) { index = this.current }
		return this.items[index[0]][index[1]]
	},
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
				var pos = wasOpen ? [0,0] : self.getPos(i, j, self.items[i].length - 1)
				
				// setTimeout(function() {
					$el.css('-webkit-transform', 'translate('+Math.round(pos[0])+'px, '+Math.round(pos[1])+'px)')
				// }, self.delay(i,j))
			})
		})
		this.isOpen = !this.isOpen
	},
	renderTag: function($tag) {
		this.$ui=$(div('picker '+this.className,
			div('lists'),
			div('current', this._renderItem(this.current, true, bind(this, this.toggle)))
		))
		// setTimeout(bind(this, function() {
			this.renderLists()
		// }), 10)
		return this.$ui
	},
	_renderItem:function(index, isCurrent, onSelect) {
		return div('item', this.renderItem(this.getItem(index), isCurrent, index), button(onSelect), style({
			'-webkit-transition':'-webkit-transform 0.20s',
			position:'absolute'
		}))
	},
	renderLists:function() {
		var selectItem = bind(this, function(i, j) {
			this.current = [i,j]
			this.$ui.find('.current').empty().append(this._renderItem([i, j], true, curry(selectItem, i, j)))
			this.toggle()
		})
		
		this.$ui.find('.lists').empty().append(div(map(this.items, this, function(list, i) {
			return div('list', map(list, this, function(item, j) {
				return this._renderItem([i, j], false, curry(selectItem, i, j))
			}))
		})))
	},
	delay:function(i,j) {
		return i * 5 + j * 40
	}
}

var colorLists = [
	//['multi1', 'multi2', 'random'],
	['multi2'],
	[[0,0,0], [180,180,180], [255,255,255]],
	[[255,255,0],[255,165,0],[255,0,255],[255,192,203],[0,255,255]],
	[[212,69,3],[236,169,31], [79,124,128], [145,161,112], [184,143,170], [171,128,88], [70,130,180]]
]
var colorPicker = proto(picker,
	function(){},
	{
		className:'colorPicker',
		items:colorLists,
		
		multiColors: {
			'multi1':colorLists[2],
			'multi2':colorLists[3],
			'random':[[255, 0, 0], [255, 125, 0], [125, 255, 125], [0, 125, 255], [0, 0, 255]]
		},
		
		renderItem: function(color, isCurrent, index) {
			var alpha = isCurrent ? 1 : .95
			var diameter = 40
			var styles = {
				width:diameter, height:diameter,
				'border-radius':25, border:'2px solid #333'
			}
			var content
			if (typeof color == 'string') {
				var c = paint([diameter, diameter])
				var r = diameter/2
				var colors = this.multiColors[color]
				var rotation = Math.PI*2/(colors.length)
				var origin = [0,0]
				c.translate([r, r]) // center
				for (var i=0; i<colors.length; i++) {
					var color = this.getRgba(colors[i], alpha)
					var lineColor = '#333'
					c.beginPath()
						.fillStyle(color).strokeStyle(lineColor)
						.lineWidth(1)
						.lineTo([0, r])
						.moveTo(origin)
						.strokeStyle(color)
						.arc(origin, r, [0, rotation], false)
						.strokeStyle(lineColor)
						.lineTo([0, Math.sin(r)])
						.moveTo(origin)
						.rotate(rotation)
						.closePath().stroke().fill()
				}
				content = c.canvas
			} else {
				styles.background = this.getRgba(color, alpha)
			}
			return div('dot', style(styles), content)
		},
		
		getColor: function(alpha) {
			var color = this.getItem()
			if (typeof color == 'string') {
				var colors = this.multiColors[color]
				do {
					var color = colors[Math.floor(Math.random() * colors.length)]
				} while (color == this.lastMultiColor)
				this.lastMultiColor = color
				return this.getRgba(color, alpha)
			} else {
				return this.getRgba(color, alpha)
			}
		},
		
		getPos: function(i, j, num) {
			var quarterCircle = Math.PI / 2
			var expand = 63
			if (!num) { num = 1 }
			return [Math.cos(j * quarterCircle/num)*expand*i, -Math.sin(j * quarterCircle/num)*expand*i - 50]
		},
		
		getRgba: function(color, alpha) {
			return 'rgba('+color.concat(alpha||0.8).join(',')+')'
		}
	}
)


var pens = require('./pens')
var paint = require('./paint')
var penPicker = proto(picker,
	function(opts) {
		this.opts = opts
	},
	{
		className:'penPicker',
		width:40, height:40,
		items:[map(pens, function(pen, i) { return pen })],
		renderItem:function(pen, isCurrent, index) {
			var width = this.width
			var height = this.height
			var styles = {
				width:width, height:height, overflow:'hidden', display:'inline-block', margin:'0 4px 0 0',
				border:'2px solid #333', borderRadius:4
			}
			return img('pen', style(styles), { src:'/blowtorch/img/pens/'+(index[1]+1)+'.png' })
		},
		getPos:function(i, j, num) {
			var w = this.width + 10
			var h = this.height + 10
			return [j * w - w, -h]
		}
	}
)

module.exports = {
	color:colorPicker,
	pen:penPicker
}

