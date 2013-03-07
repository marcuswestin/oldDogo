var composeOverlay = module.exports = {
	show:show,
	headIcon:headIcon
}

function headIcon() {
	return div(style(fullHeight, fullWidth), div(style({ display:'block' }, unitPadding(1, 2)), graphic('216-compose', 23, 18)), button(function() {
		composeOverlay.show()
	}))
}

var list
function show() {
	var offsetTop = 20
	list = makeList({
		renderItem:renderItem,
		selectItem:selectItem,
		renderEmpty:function(){}
	})
	Conversations.read(function(err, conversations) {
		if (err) { return error(err) }
		list.append(slice(conversations, 0, 50))
	})
	overlay.show({ background:'#fff' }, function() {
		bridge.command('BTTextInput.setConfig', { preventWebviewShift:true }, function() {
			$('#searchInput').focus()
		})
		return div(
			style({ width:viewport.width(), height:viewport.height(), display:'inline-block' }),
			div(style({ zIndex:1 }, absolute(0, statusBarHeight)),
				appHead(
					div(style(fullHeight, fullWidth, { marginTop:unit*0.75 }), graphic('close', 20, 20), button(hide)),
					input({ id:'searchInput' }, style(unitMargin(1/2,0), radius(20), {
						display:'block', height:27, width:182, background:'#fff'
					})),
					div(style(fullHeight, fullWidth), div(style({ display:'block' }, unitPadding(1, 2)), graphic('216-compose', 23, 18)), button(function() {
						
					}))
				)
			),
			div(style({ height:viewport.height() - unit/2 }, scrollable.y),
				div(style({ paddingTop:unit*9, textAlign:'left', color:'#222', textShadow:'none' }),
					list
				)
			)
		)
	})
	
	function renderItem(contact) {
		return div(style({ padding:px(unit * 1.25), height:unit*3, background:'#fff', borderBottom:'1px solid #ccc' }), 
			contact.name + ' (' + contact.addressId + ')'
		)
	}
	
	function selectItem(convo) {
		hide()
		gScroller.push({ view:'conversation', conversation:convo })
	}
}

events.on('app.start', function() {
	$(document).on('keyup', '#searchInput', function() {
		var $el = $(this)
		nextTick(function() {
			var input = trim($el.val())
			if (!input) { return list.empty() }
			Contacts.lookupByPrefix(input, function(err, contacts) {
				if (err) { return error(err) }
				list.empty().append(contacts)
			})
		})
	})
})

function hide() {
	bridge.command('BTTextInput.resetConfig')
	overlay.hide()
}