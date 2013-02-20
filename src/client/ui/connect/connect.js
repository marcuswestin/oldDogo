var renderWelcome = require('client/ui/connect/renderWelcome')
var renderLogin = require('client/ui/connect/renderLogin')
var renderRegister = require('client/ui/connect/renderRegister')

var welcomeDuration = 150

module.exports = {
	render: function(viewStack) {
		
		// setTimeout(function() { gScroller.push({ step:'register', registerStep:'profile' }) }) // AUTOS
		// setTimeout(function() { gScroller.push({ step:'register', registerStep:'facebook' }) }) // AUTOS
		// setTimeout(function() { gScroller.push({ step:'login' }) }) // AUTOS
		
		if (!viewStack || !viewStack.length) { viewStack = [{ step:'welcome' }] }
		gScroller = makeScroller({
			duration:400,
			alwaysBounce:false,
			renderHead:renderHead,
			renderBody:renderBody,
			stack: viewStack,
			headHeight:0
		})
		return div({ id:'connectView' },
			div('center', style(absolute(0, 16*units), { width:viewport.width() }), graphic('logoName', 128, 64)),
			// div(style({ position:'absolute', width:'100%', top:0 }),
			// 	div({ id:'userPic' }, style({ borderRadius:50, position:'absolute', top:30, right:10, opacity:0 }))
			// )
			// delayed(welcomeDuration * 2, function() { $('#logoName').css(translate(0, -169, welcomeDuration * 1.25)) }),
			gScroller
		)


		
		function renderHead(view) {
			if (view.step == 'welcome') { return '' }
			return div('button',
				style(absolute(4*units, 17.5*units), { padding:0, width:5*units, height:5*units }),
				graphic('backArrow', 16, 16, translate.y(1.5*unit)),
				button(function() { gScroller.pop() })
			)
		}
		
		function renderBody(view) {
			return div(div('stepView', _pickViewContent()))
			function _pickViewContent() {
				switch (view.step) {
					case 'register': return renderRegister(view)
					case 'login': return renderLogin(view)
					case 'welcome':
					default: return renderWelcome(view, welcomeDuration)
				}
			}
		}
	},
	slideOut: function() {
		var duration = 750
		$('#connectView').css(transition('opacity', duration)).css('opacity', 0)
		setTimeout(function() {
			// Warning: Actually removing the content view after the transition has completed causes an error where the screen becomes unresponsive. ¿Que?
			$('#connectView').css(translate.y(-viewport.height()-100, 0))
		}, duration)
	}
}
