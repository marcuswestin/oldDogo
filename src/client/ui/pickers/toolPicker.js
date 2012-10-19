var pens = require('../pens')
var basePicker = require('./basePicker')
var makeColorPicker = require('./colorPicker')
var makeStampPicker = require('./stampPicker')

var mustache = {
	path:'stamp-mustache',
	create:function(opts) {
		return {
			handleDown:function(p) {
				opts.paint.style('#000').fillRect(p, [10,10])
			},
			handleMove:function(p) {
				
			},
			handleUp:function(p) {
				
			}
		}
	}
}

module.exports = proto(basePicker,
	function(opts) {
		this.opts = options(opts, {
			paint:null,
			width:null,
			height:null,
			stampPicker:makeStampPicker(),
			colorPicker:makeColorPicker()
		})
	}, {
		getCurrent:function() {
			return this.current.create(this.opts)
		},
		getSecondary:function(current) {
			switch (current.path) {
				case 'stamp-mustache': return this.opts.stampPicker
				case 'pen-fill': return this.opts.colorPicker
			}
		},
		current: pens.byName.fill,
		className:'toolPicker',
		closeSize:[48,48],
		openSize:[96,96],
		itemLists:[[pens.byName.fill, mustache]],
		renderItem:function(pen, isCurrent) {
			var styles = {
				width:this.closeSize[0], height:this.closeSize[1], overflow:'hidden', display:'inline-block', margin:'0 4px 0 0',
				border:'2px solid #433', borderRadius:4,
				background:'#fff'
			}
			return img('pen', style(styles, transition('width, height', 100)), { src:image.url(pen.path) })
		},
		getPos:function(i, j, num) {
			var w = this.openSize[0] + 10
			var h = this.openSize[1] + 10
			return [j * w, -h * (i + 1)]
		},
		onOpen:function(i,j,$el) {
			$el.find('.pen').css({ width:this.openSize[0], height:this.openSize[1] })
		},
		onClose:function(i,j,$el) {
			$el.find('.pen').css({ width:this.closeSize[0], height:this.closeSize[1] })
		}
	}
)

