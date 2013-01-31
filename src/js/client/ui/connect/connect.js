var renderFirstStep = require('client/ui/connect/renderFirstStep')
var renderEnterPersonInfo = require('client/ui/connect/renderEnterPersonInfo')
var renderEnterAddress = require('client/ui/connect/renderEnterAddress')
var renderLinkSent = require('client/ui/connect/renderLinkSent')
var renderLinkClicked = require('client/ui/connect/renderLinkClicked')
var renderAddFriends = require('client/ui/connect/renderAddFriends')
var renderPushNotifications = require('client/ui/connect/renderPushNotifications')

module.exports = {
	render: function(onDone) {
		var scroller = makeScroller({
			numViews:5,
			duration:400,
			alwaysBounce:false,
			renderView:renderView,
			stack: [{ step:'first' }]
		})
		return div({ id:'connectView' }, brandGradient([viewport.width() / 2, 150], 50),
			div('logoIcon', icon('logoIcon-blank', 128, 128, 48, 0, 0, 0)),
			div({ id:'logoName' }, icon('logoName', 166, 72, 64, 0, 0, 0), style(translate(0, 0, 1000))),
			scroller
		)
		
		function renderView(view, info) {
			switch (view.step) {
				case 'first': return renderFirstStep(view)
				case 'enterPersonInfo': return renderEnterPersonInfo(view)
				case 'enterAddress': return renderEnterAddress(view)
				case 'linkSent': return renderLinkSent(view)
				case 'linkClicked': return renderLinkClicked(view)
				case 'addFriends': return renderAddFriends(view)
				case 'pushNotifications': return renderPushNotifications(view, onDone)
				default: return alert('unknown view ' + JSON.stringify(view))
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