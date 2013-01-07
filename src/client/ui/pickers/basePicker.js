var currentPicker
var zIndex = 1
var duration = 200

module.exports = {
	getCurrent:function() {
		return this.current
	},
	getSecondary:function() {},
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
		$('#'+this.id+' .primary').css({ zIndex:zIndex++ }).find('.list').each(function(i) {
			$(this).find('.item').each(function(j) {
				var $el = $(this)
				var pos = wasOpen ? [0,0] : self.getPos(i, j, self.itemLists[i].length - 1)
				
				if (wasOpen) { self.onClose(i,j,$el) }
				else { self.onOpen(i,j,$el) }
				
				setTimeout(function() {
					$el.css(translate(pos[0], pos[1]))
				}, self.delay(i,j))
			})
		})
		$('#'+this.id+' .primary').find('.current').css({ zIndex:zIndex++ })
		this.isOpen = !this.isOpen
	},
	onClose:function(i,j){},
	onOpen:function(i,j){},
	__renderTag: function($tag) {
		this.id = tags.id()
		return div('picker '+this.className, { id:this.id },
			div('primary',
				div('lists', this.renderLists()),
				div('current', this._renderItem(this.current, true, bind(this, this.toggle)))
			),
			div('secondary',
				this.getSecondary(this.current)
			)
		)
	},
	_renderItem:function(item, isCurrent, onSelect) {
		var touchHandler = isCurrent ? button(curry(onSelect, item)) : this.touchHandler(onSelect, item)
		return div('item', touchHandler, style({ position:'absolute' }), style(translate(0, 0, duration)),
			this.renderItem(isCurrent ? this.current : item, isCurrent)
		)
	},
	renderLists:function() {
		var selectItem = bind(this, function(payload) {
			this.current = payload
			$('#'+this.id+' .primary').find('.current').empty().append(this._renderItem(payload, true, bind(this, this.toggle)))
			$('#'+this.id+' .secondary').empty().append(this.getSecondary(this.current))
			this.toggle()
		})
		
		return map(this.itemLists, this, function renderList(list, i) {
			return div('list', map(list, this, function renderListItem(payload, j) {
				return this._renderItem(payload, false, selectItem)
			}))
		})
	},
	touchHandler:function(onSelect, item) {
		return button(curry(onSelect, item))
	},
	delay:function(i,j) {
		return i * 10 + j * 30
	}
}
