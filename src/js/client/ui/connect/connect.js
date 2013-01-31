var delayed = require('std/delayed')
var renderFirstStep = require('client/ui/connect/renderFirstStep')
var renderEnterPersonInfo = require('client/ui/connect/renderEnterPersonInfo')
var renderEnterAddress = require('client/ui/connect/renderEnterAddress')
var renderLinkSent = require('client/ui/connect/renderLinkSent')
var renderLinkClicked = require('client/ui/connect/renderLinkClicked')
var renderAddFriends = require('client/ui/connect/renderAddFriends')
var renderPushNotifications = require('client/ui/connect/renderPushNotifications')

module.exports = {
	render: function(onDone) {
		gScroller = makeScroller({
			numViews:5,
			duration:400,
			alwaysBounce:false,
			renderHead:renderHead,
			renderView:renderView,
			stack: [{ step:'first' }]
		})
		var welcomeDuration = 50
		return div({ id:'connectView' }, brandGradient([viewport.width() / 2, 150], 50),
			div('logoIcon', icon('logoIcon-blank', 128, 128, 48, 0, 0, 0)),
			div({ id:'logoName' }, icon('logoName', 166, 72, 64, 0, 0, 0), style(translate(0, 0, 1000))),
			delayed(welcomeDuration * 2, function() { $('#logoName').css(translate(0, -169, welcomeDuration * 1.25)) }),
			gScroller
		)
		
		function renderHead(view) {
			if (view.step == 'first') { return '' }
			return div('button', '<-', style(absolute(20, 40)), style({ width:40, height:40, padding:0 }), button(function() {
				gScroller.pop()
			}))
		}
		
		function renderView(view) {
			return div(style({ marginTop:300 }), _pickViewContent())
			function _pickViewContent() {
				switch (view.step) {
					case 'first': return renderFirstStep(view)
					case 'enterAddress': return renderEnterAddress(view)
					case 'enterPersonInfo': return renderEnterPersonInfo(view)
					case 'linkSent': return renderLinkSent(view)
					case 'linkClicked': return renderLinkClicked(view)
					case 'addFriends': return renderAddFriends(view)
					case 'pushNotifications': return renderPushNotifications(view, onDone)
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