var parallel = require('std/parallel')
var Conversations = require('client/conversations')

module.exports = function renderWelcome(view, welcomeDuration) {
	return div({ id:'connectUI1' }, style({ position:'absolute', bottom:0*units, width:viewport.width() }),
		delayed(welcomeDuration, function() {
			$('#connectUI1').append(div(_fadeIn,
				div('listMenu',
					div('menuItem',
						listMenuContent('listMenuPlus', 'Register'),
						button(function() { gScroller.push({ step:'register' }) })),
					div('menuItem',
						listMenuContent('listMenuPerson', 'Sign in'),
						button(function() { gScroller.push({ step:'login' }) }))
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
