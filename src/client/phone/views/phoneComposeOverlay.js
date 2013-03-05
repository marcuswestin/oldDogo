module.exports = {
	show:show
}

function show() {
	var offsetTop = 20
	var list = makeList({
		renderItem:renderItem,
		selectItem:selectItem,
		renderEmpty:function(){}
	})
	Conversations.read(function(err, conversations) {
		if (err) { return error(err) }
		list.append(slice(conversations, 0, 50))
	})
	overlay.show({ background:'white' }, function() {
		bridge.command('BTTextInput.setConfig', { preventWebviewShift:true }, function() {
			$('#searchInput').focus()
		})
		return div(
			style({ width:viewport.width(), height:viewport.height(), display:'inline-block' }),
			div(style({ zIndex:1 }, absolute(0, statusBarHeight)),
				appHead(
					div(style(fullHeight, fullWidth), graphic('close', 32, 32), button(hide)),
					input({ id:'searchInput' }, style({ display:'inline-block', height:27, width:182 }, unitMargin(1/2,0))),
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
	
	function renderItem(convo) {
		return div(style({ padding:px(unit * 1.25), height:unit*3, background:'#fff', borderBottom:'1px solid #ccc' }), 
			convo.people[0].name
		)
	}
	
	function selectItem(convo) {
		hide()
		gScroller.push({ view:'conversation', conversation:convo })
	}
}

function hide() {
	bridge.command('BTTextInput.resetConfig')
	overlay.hide()
}