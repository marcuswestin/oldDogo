var pens = require('../pens')
var basePicker = require('./basePicker')

module.exports = proto(basePicker,
	function(opts) {
		this.opts = opts
	}, {
		current: pens.list[0],
		className:'penPicker',
		closeSize:[48,48],
		openSize:[85,85],
		itemLists:[pens.list.slice(0,3), pens.list.slice(3, 6)],
		renderItem:function(pen, isCurrent) {
			var styles = {
				width:this.closeSize[0], height:this.closeSize[1], overflow:'hidden', display:'inline-block', margin:'0 4px 0 0',
				'-webkit-transition-property': 'width, height',
				'-webkit-transition-duration': '0.10s',
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

