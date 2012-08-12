var searchButton = require('./searchButton')
var home = require('./home')
var conversation = require('./conversation')
var composer = require('./composer')

module.exports = {
	createAndRender:createAndRenderScroller
}

function createAndRenderScroller() {
	gScroller = tags.scroller({ onViewChange:function onViewChange() { events.fire('view.change') }, duration:400 })
	$('#viewport').prepend(div('dogoApp',
		gScroller.renderHead(gHeadHeight, scrollerRenderHeadContent),
		gScroller.renderBody(3, scrollerRenderBodyContent)
	))
}

function scrollerRenderHeadContent($head, view, viewBelow, fromView) {
	var stackIsAboveHome = (gScroller.stack.length > 1)
	var stackIsAboveConnect = (gScroller.stack.length > 0)
	var stackIsAtHome = (gScroller.stack.length == 1)
	var showBackButton = viewBelow && stackIsAboveHome
	var showSearch = stackIsAtHome
	$head.append(div('head',
		(appInfo.config.mode == 'dev') && div('devBar',
			div('button', 'R', button(function() { bridge.command('app.restart') })),
			div('button', 'X', button(function() { gState.clear(); bridge.command('app.restart') })),
			div('button', 'U', button(function() { gState.checkNewVersion() }))
		),
		showBackButton && renderBackButton(viewBelow.title || 'Home'),
		div('title', view.title || 'Dogo'),
		showSearch && searchButton.render()
	))
	function renderBackButton(title) {
		return div('button back', title, button(function() {
			gScroller.pop()
		}))
	}
}

events.on('searchButton.results', function(info) {
	if (info.showing) {
		$('.scroller-head').addClass('flat')
	} else {
		$('.scroller-head').removeClass('flat')
	}
})


function scrollerRenderBodyContent($body, view) {
	console.log("scroller.scrollerRenderBodyContent", JSON.stringify(view))
	var convo = view.conversation
	if (convo) {
		$body.append(
			conversation.render({
				accountId:convo.accountId,
				facebookId:convo.facebookId,
				messages:gState.cache[conversation.id(convo, 'messages')],
				myAccountId:gState.myAccount().accountId,
				height:viewport.height() - gScroller.$head.height()
			}),
			composer.render({ accountId:convo.accountId, facebookId:convo.facebookId })
		)
		conversation.refreshMessages()
	} else {
		home.render($body, view)
	}
	console.log("scroller.scrollerRenderBodyContent done")
}
