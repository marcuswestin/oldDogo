var parallel = require('std/parallel')
var Conversations = require('client/conversations')

module.exports = function renderWelcome(view) {
	var welcomeDuration = 400
	return div({ id:'connectUI1' }, style(translate.y(310)),
		delayed(welcomeDuration * 2, function() {
			$('#connectUI1').append(div(_fadeIn,
				div('listMenu',
					div('menuItem', span('label', 'Register'), button(function() { gScroller.push({ step:'register' }) })),
					div('menuItem', span('label', 'Sign In'), button(function() { gScroller.push({ step:'login' }) }))
				),
				
				div('button disabled', 'hidden', style({ visibility:'hidden' }))
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
	
	function _renderLogoName() {
		return div(icon('logoName', 56, 24), style({ display:'inline-block', marginTop:-6 }), style(translate.y(7)))
	}	
}
