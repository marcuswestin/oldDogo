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
	Conversations.read(function(err, conversations) {
		if (err) { return error(err) }
		list.append(slice(conversations, 0, 50))
	})
	overlay.show({ background:'#fff' }, function() {
		nextTick(function() {
			bridge.command('BTTextInput.setConfig', { preventWebviewShift:true }, function() {
				$('#searchInput').focus()
			})
		})
		return div(
			style(appBg, { width:viewport.width(), height:viewport.height(), display:'inline-block' }),
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
				div(style({ paddingTop:unit*8, textAlign:'left', color:'#222', textShadow:'none' }),
					list
				)
			)
		)
	})
	
	function renderItem(contact) {
		var imageSize = unit * 4
		var resize = imageSize*2+'x'+imageSize*2
		if (contact.hasLocalImage) {
			var imageParams = { mediaModule:'BTAddressBook', mediaId:contact.localId, resize:resize }
		} else if (Addresses.isFacebook(contact)) {
			var imageParams = { url:face.facebookUrl(contact), resize:resize }
		}
		
		var imageStyle = imageParams ? graphics.backgroundImage(BT.url('BTImage', 'fetchImage', imageParams), imageSize, imageSize) : null
		return div(style(unitPadding(1.25, .5), { height:unit*3, background:'#fff', borderBottom:'1px solid #ccc' }),
			imageStyle && div(style(imageStyle, { display:'inline-block' })),
			contact.name + ' (' + contact.addressType + ', '+contact.addressId + ')'
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
			Contacts.lookupByPrefix(input, { limit:40 }, function(err, contacts) {
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

events.on('keyboard.willShow', function(info) {
	$('#searchResults').css(transition('height', info.keyboardAnimationDuration)).css({ height:viewport.height() - keyboardHeight })
})

events.on('keyboard.willHide', function(info) {
	$('#searchResults').css(transition('height', info.keyboardAnimationDuration)).css({ height:viewport.height() })
})