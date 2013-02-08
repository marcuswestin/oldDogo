var renderWelcome = require('client/ui/connect/renderWelcome')
var renderLogin = require('client/ui/connect/renderLogin')
var renderRegister = require('client/ui/connect/renderRegister')

module.exports = {
	render: function(onDone) {
		
		// setTimeout(function() { gScroller.push({ step:'register', registerStep:'profile' }) }) // AUTOS
		// setTimeout(function() { gScroller.push({ step:'register', registerStep:'facebook' }) }) // AUTOS
		// setTimeout(function() { gScroller.push({ step:'login' }) }) // AUTOS
		
		gScroller = makeScroller({
			numViews:5,
			duration:400,
			alwaysBounce:false,
			renderHead:renderHead,
			renderView:renderView,
			stack: [{ step:'welcome' }]
		})
		var welcomeDuration = 500
		return div({ id:'connectView' }, brandGradient([viewport.width() / 2, 150], 50),
			div('centered',
				div('logoIcon', icon('logoIcon-blank', 128, 128, 48, 0, 0, 0)),
				div({ id:'logoName' }, icon('logoName', 166, 72, 64, 0, 0, 0), style(translate(0, 0, 1000))),
				div(style({ position:'absolute', width:'100%', top:0 }),
					div({ id:'userPic' }, style({ borderRadius:50, position:'absolute', top:30, right:10, opacity:0 }))
				)
			),
			delayed(welcomeDuration * 2, function() { $('#logoName').css(translate(0, -169, welcomeDuration * 1.25)) }),
			gScroller
		)
		
		function renderHead(view) {
			if (view.step == 'welcome') { return '' }
			return div('button', '<-', style(absolute(10, 30)), style({ padding:px(6, 8) }), button(function() {
				gScroller.pop()
			}))
		}
		
		function renderView(view) {
			return div(div('stepView', _pickViewContent()))
			function _pickViewContent() {
				switch (view.step) {
					case 'welcome': return renderWelcome(view)
					case 'register': return renderRegister(view)
					case 'login': return renderLogin(view)
					default: return ['Unknown view', JSON.stringify(view)]
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