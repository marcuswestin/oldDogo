var currentPicker
var zIndex = 1

module.exports = {
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
