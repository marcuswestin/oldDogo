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
				
				setTimeout(function() {
					$el.css('-webkit-transform', 'translate('+Math.round(pos[0])+'px, '+Math.round(pos[1])+'px)')
				}, self.delay(i,j))
			})
		})
		this.isOpen = !this.isOpen
	},
	renderTag: function($tag) {
		this.$ui=$(div('picker '+this.className,
			div('lists'),
			div('current', this._renderItem(this.current, true, bind(this, this.toggle)))
		))
		setTimeout(bind(this, function() {
			this.renderLists()
		}), 10)
		return this.$ui
	},
	_renderItem:function(index, isCurrent, onSelect) {
		return div('item', this.renderItem(this.getItem(index), isCurrent), button(onSelect), style({
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
		
		renderItem: function(color, isCurrent) {
			var alpha = isCurrent ? 1 : .95
			var diameter = 40
			var styles = {
				width:diameter, height:diameter,
				'border-radius':25, border:'2px solid #333'
			}
			var content
			if (typeof color == 'string') {
				var c = draw([diameter, diameter])
				c.canvas.className = 'multiDot'
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
var makeDraw = require('./draw')
var penPicker = proto(picker,
	function(opts) {
		this.opts = opts
	},
	{
		className:'penPicker',
		width:40, height:40,
		items:[map(pens, function(pen, i) { return pen })],
		renderItem:function(pen, isCurrent) {
			var width = this.width
			var height = this.height
			var styles = {
				width:width, height:height, overflow:'hidden', display:'inline-block', margin:'0 4px 0 0',
				border:'2px solid #333', borderRadius:4
			}
			return div('pen', style(styles), bind(this, function($tag) {
				var c = makeDraw([width, height]).background(this.opts.background)
				$tag.append(c.canvas)
				var p = pen({ colorPicker:this.opts.colorPicker, draw:c, width:width, height:height })
				var points = [
					[156,627],[165,627],[170,627],[177,626],[184,622],[192,618],[198,613],[204,607],
					[209,601],[212,596],[214,590],[215,584],[215,578],[215,573],[215,568],[211,566],
					[207,564],[203,563],[199,563],[195,563],[192,563],[189,563],[187,565],[186,570],
					[186,575],[186,583],[186,592],[189,598],[192,605],[197,610],[203,615],[209,619],
					[216,623],[222,626],[227,627],[230,628],[233,628],[235,628],[235,628]]
				var max = [0,0]
				var min = [9999999,999999]
				each(points, function(p) {
					if (p[0] > max[0]) { max[0] = p[0] }
					if (p[1] > max[1]) { max[1] = p[1] }
					if (p[0] < min[0]) { min[0] = p[0] }
					if (p[1] < min[1]) { min[1] = p[1] }
				})
				min[0] -= 5
				min[1] -= 10
				// max[0] += 5
				// max[1] += 5
				var delta = [max[0] - min[0], max[1] - min[1]]
				c.scale([.425, .425])
				points = map(points, function(p) {
					return [p[0] - min[0], p[1] - min[1]]
				})
				p.handleDown([points[0][0], points[0][1]])
				for (var i=1; i<points.length - 2; i++) {
					if (i % 2 == 0) { continue }
					p.handleMove([points[i][0], points[i][1]])
					if (p.draw) { p.draw() }
				}
				p.handleUp([points[i][0], points[i][1]])
			}))
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

