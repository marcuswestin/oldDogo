module.exports = {
	render:render,
	update:update
}

var $bg
function render() {
	return $bg=$(div('appBackground', style({
		overflowY:'scroll',
		webkitOverflowScrolling:'touch'
	})))
}

function update(width) {
	var top = 10
	$bg.empty().css({ width:width, marginTop:top, height:viewport.height()-top, background:'#222' }).append(
		div('card',
			div('face', style(face.backgroundStyle(gState.myAccount().facebookId, true))),
			div('summary',
				div('name', gState.myAccount().name),
				div('lastMessage', div(style({ fontStyle:'italic' }), 'This is you'))
			)
		)
	)
}
