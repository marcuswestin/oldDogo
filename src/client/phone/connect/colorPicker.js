var colors = require('client/colors')

div('menuItem', span('placeholder pickColor', 'Your Color:'), colorDot, button(function() {
	var padding = 1
	var colorMargin = 1
	var colorWidth = 88
	var colorStyles = { width:colorWidth, height:37, margin:colorMargin, borderRadius:2, 'float':'left', boxShadow:'inset 0 1px 0 0 rgba(255,255,255,.5), inset 0 -1px 2px rgba(0,0,0,.3)' }
	$('#name').blur()
	overlay.show({ height:300 + padding*2, width:colorWidth * 3 + padding*2 + colorMargin * 6, dismissable:false}, function() {
		return div(
			style({ background:'#fff', borderRadius:4, padding:padding, boxShadow:'0 1px 2px rgba(0,0,0,.75)' }, translate.y(-62)),
			list({
				items:map(colors, function(rgb, i) { return { rgb:rgb, id:i+1 } }),
				renderItem:renderColor,
				selectItem:function(color) {
					overlay.hide()
					$('#colorDot').css(transition('background', 500)).css({ background: colors.rgba(color.rgb, .6) })
					$('.pickColor.placeholder').css(transition('color', 500)).css({ color:'#222' })
					view.color = color.id
				}
			}),
			div('clear')
		)
		
		function renderColor(color) {
			return div(style(colorStyles, { background:colors.rgb(color.rgb) }))
		}
	})
}))
