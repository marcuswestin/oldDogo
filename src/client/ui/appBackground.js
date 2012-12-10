module.exports = {
	render:render,
	update:update
}

var mdot = function() { return $('<span> &middot; </span>') }

var $bg
function render() {
	return $bg=$(div('appBackground', style({
		overflowY:'scroll',
		webkitOverflowScrolling:'touch'
	})))
}

function update(width) {
	var top = 10
	var linkStyle = style({ color:'#126EAF' })
	$bg.empty().css({ width:width, marginTop:top, height:viewport.height()-top, background:'#222' }).append(
		div('card',
			div('face', style(face.backgroundStyle(gState.myAccount().facebookId, true))),
			div('summary',
				div('name', gState.myAccount().name),
				div('lastMessage', div(style({ fontStyle:'italic' }), 'This is you'))
			)
		),
		div(
			style({ textAlign:'center', fontStyle:'italic', color:'#ccc', textShadow:'0 1px 0 #666', marginTop:140 }),
			'Your Memories will show up here'
		),
		div(
			style({ width:'100%', position:'absolute', bottom:10, left:0, textAlign:'center', fontSize:12, color:'#ddd' }),
			a(linkStyle, { href:'/terms', target:'_blank' }, 'Terms of Service'),
			mdot().css({ fontSize:18, position:'relative', top:3 }),
			a(linkStyle, { href:'/privacy', target:'_blank' }, 'Privacy Policy'),
			br(), span(style({ textShadow:'0 1px 0 rgba(255, 255, 255, .3)' }), 'Made with love by Marcus Westin')
		)
	)
}
