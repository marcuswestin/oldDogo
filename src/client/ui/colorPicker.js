var picker = {
	current: [0,0],
	getItem:function() {
		return this.items[this.current[0]][this.current[1]]
	},
	open:false,
	renderTag: function($tag) {
		var toggle = bind(this, function() {
			var wasOpen = this.open
			var self = this
			$ui.find('.colors .list').each(function(i) {
				$(this).find('.dot').each(function(j) {
					var $el = $(this)
					var pos = self.getPos(i+1, j, self.items[i].length - 1, wasOpen)
					
					setTimeout(function() {
						$el.css('-webkit-transform', 'translate('+Math.round(pos[0])+'px, '+Math.round(pos[1])+'px)')							
					}, self.delay(i,j))
				})
			})
			this.open = !this.open
		})
		
		var selectItem = bind(this, function(i, j) {
			this.current = [i,j]
			$ui.find('.current').empty().append(this.renderItem(toggle, this.getItem(), true))
			toggle()
		})
		
		return $ui=$(div('colorPicker', style({ position:'relative' }),
			div('colors', map(this.items, this, function(list, i) {
				return div('list', map(list, this, function(item, j) {
					return this.renderItem(curry(selectItem, i, j), item, false)
				}))
			})),
			div('current', this.renderItem(toggle, this.getItem(), true))
		))
	},
	delay:function(i,j) {
		return i * 5 + j * 40
	}
}

var colorLists = [
	['multi1', 'multi2', 'random'],
	[[255,255,0],[255,165,0],[255,0,255],[255,192,203],[0,255,255]],
	[[212,69,3],[236,169,31], [79,124,128], [145,161,112], [184,143,170], [171,128,88], [70,130,180]]
]

module.exports = proto(picker,
	function(){
		
	},
	{
		items:colorLists,
		
		multiColors: {
			'multi1':colorLists[1],
			'multi2':colorLists[2],
			'random':[[255, 0, 0], [255, 125, 0], [125, 255, 125], [0, 125, 255], [0, 0, 255]]
		},
		
		renderItem: function(onSelect, color, isCurrent) {
			var alpha = isCurrent ? 1 : .90
			var diameter = 40
			var styles = {
				width:diameter, height:diameter,
				'-webkit-transition':'-webkit-transform 0.20s', //'-webkit-transition-delay':delay(i,j)/1000+'s',
				position:'absolute', 'border-radius':25, border:'3px solid #fff', boxShadow:'0 1px 1px #333'
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
					c.beginPath()
						.fillStyle(getRgba(colors[i], alpha)).strokeStyle('#fff')
						.lineWidth(1)
						.lineTo([0, r])
						.moveTo(origin)
						.arc(origin, r, [0, rotation], false)
						.lineTo([0, Math.sin(r)])
						.moveTo(origin)
						.rotate(rotation)
						.closePath().stroke().fill()
				}
				content = c.canvas
			} else {
				styles.background = getRgba(color, alpha)
			}
			return div('dot', style(styles), content, button(onSelect))
		},
		
		getColor: function(alpha) {
			var color = this.getItem()
			if (typeof color == 'string') {
				var colors = this.multiColors[color]
				do {
					var color = colors[Math.floor(Math.random() * colors.length)]
				} while (color == this.lastMultiColor)
				this.lastMultiColor = color
				return getRgba(color, alpha)
			} else {
				return getRgba(color, alpha)
			}
		},
		
		getPos: function(i, j, num, wasOpen) {
			var quarterCircle = Math.PI / 2
			var expand = 63
			
			return wasOpen
				? [0,0]
				: [Math.cos(j * quarterCircle/num)*expand*i, -Math.sin(j * quarterCircle/num)*expand*i]
		}
	}
)

var getRgba = function(color, alpha) {
	return 'rgba('+color.concat(alpha||0.8).join(',')+')'
}

