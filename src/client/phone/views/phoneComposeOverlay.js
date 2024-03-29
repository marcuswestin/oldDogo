var composeOverlay = module.exports = {
	show:show,
	headIcon:headIcon
}

function headIcon(onTap) {
	return div(style(fullHeight, fullWidth), div(style({ display:'block' }, unitPadding(1, 2)), graphic('216-compose', 23, 18)), button(onTap || function() {
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
	overlay.show({ background:'#fff' }, function() {
		nextTick(function() {
			bridge.command('BTTextInput.setConfig', { preventWebviewShift:true }, function() {
				$('#searchInput').focus()
			})
		})
		return div(
			style({ width:viewport.width(), height:viewport.height(), display:'inline-block' }),
			div(style({ zIndex:1 }, absolute(0, statusBarHeight)),
				appHead(
					div(style(fullHeight, fullWidth, { marginTop:unit*0.75 }), graphic('close', 20, 20), button(hide)),
					input({ id:'searchInput' }, style(unitMargin(1/2,0), radius(20), {
						display:'block', height:27, width:182, background:'#fff'
					})),
					headIcon(function() {
						
					})
				)
			),
			div({ id:'searchResults' }, style({ height:viewport.height() - keyboardHeight }, scrollable.y),
				div(style({ paddingTop:unit*8, textAlign:'left', color:'#222', textShadow:'none', whiteSpace:'nowrap' }),
					list
				)
			)
		)
	})
	
	function renderItem(contact) {
		var faceStyle = face.style(contact, { size:unit*6 })
		var padding = unit/4
		var addressDisplay = Addresses.isFacebook(contact) ? 'Facebook' : contact.addressId
		return div(style({ padding:padding, height:unit*6, background:'#fff', borderBottom:'1px solid #ccc' }),
			faceStyle && div(style(faceStyle, { 'float':'left', marginRight:unit })),
			div(style(translate.y(unit * 1.5), { overflow:'hidden', textOverflow:'ellipsis' }), contact.name + ' (' + addressDisplay + ')')
		)
	}
	
	function selectItem(contact) {
		hide()
		gScroller.push({ view:'conversation', contacts:[sessionInfo.person, contact] })
	}
}

events.on('app.start', function() {
	var nextInput
	$(document).on('keyup', '#searchInput', function() {
		var $el = $(this)
		nextTick(function() {
			if (!nextInput) { nextTick(_doSearch) }
			nextInput = trim($el.val())
		})
	})
	function _doSearch() {
		var input = nextInput
		Contacts.lookupByPrefix(nextInput, { limit:40 }, function(err, contacts) {
			if (err) { return error(err) }
			list.empty().append(contacts)
			if (input != nextInput) {
				_doSearch()
			} else {
				nextInput = null
			}
		})
	}
})

function hide() {
	bridge.command('BTTextInput.resetConfig')
	overlay.hide()
}

events.on('keyboard.willShow', function(info) {
	$('#searchResults').css(transition('height', info.keyboardAnimationDuration)).css({ height:viewport.height() - keyboardHeight })
})

events.on('keyboard.willHide', function(info) {
	$('#searchResults').css(transition('height', info.keyboardAnimationDuration)).css({ height:viewport.height() })
})