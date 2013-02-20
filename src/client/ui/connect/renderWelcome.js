var parallel = require('std/parallel')
var Conversations = require('client/conversations')

module.exports = function renderWelcome(view, welcomeDuration) {
	var arrow = div(graphics.graphic('listMenuArrow', 16, 16), style({ position:'absolute', right:units*5.5 }, translate.y(2)))
	var plus = graphics.graphic('listMenuPlus', 20, 20, { position:'absolute', left:units*5.5 })
	var person = graphics.graphic('listMenuPerson', 20, 20, { position:'absolute', left:units*5.5 })
	var padLeft = { paddingLeft:unit*3 }
	return div({ id:'connectUI1' }, style({ position:'absolute', bottom:0, width:viewport.width() }),
		delayed(welcomeDuration, function() {
			$('#connectUI1').append(div(_fadeIn,
				div('listMenu',
					div('menuItem', arrow, plus, span(style(padLeft), 'Register'), button(function() { gScroller.push({ step:'register' }) })),
					div('menuItem', arrow, person, span(style(padLeft), 'Sign In'), button(function() { gScroller.push({ step:'login' }) }))
				),
				
				div('button disabled', 'hidden', style({ display:'none' }))
			))
		})
	)
	
	function _fadeIn() {
		var id = tags.id()
		return [
			{ id:id }, style({ opacity:0 }), style(transition('opacity', welcomeDuration)),
			delayed(welcomeDuration, function() { $('#'+id).css({ opacity:1 }) })
		]
	}
}
