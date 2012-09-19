var searchButton = require('./searchButton')
var home = require('./home')
var conversation = require('./conversation')
var composer = require('./composer')

module.exports = {
	createAndRender:createAndRenderScroller
}

function createAndRenderScroller() {
	gScroller = tags.scroller({ onViewChange:function onViewChange() { events.fire('view.change') }, duration:300 })
	$('#viewport').prepend(div('dogoApp',
		gScroller.renderHead(gHeadHeight, scrollerRenderHeadContent),
		gScroller.renderBody(3, scrollerRenderBodyContent)
	))
}

function scrollerRenderHeadContent(view, opts) {
	var isHome = (gScroller.stack.length == 1)
	var stackIsAboveHome = (gScroller.stack.length > 1)
	var showBackButton = (opts.viewBelow && stackIsAboveHome)
	return div('head',
		(appInfo.config.mode == 'dev') && div('devBar',
			div('button', 'R', button(function() { bridge.command('app.restart') })),
			div('button', 'X', button(function() { gState.clear(); bridge.command('app.restart') })),
			div('button', 'U', button(function() { gState.checkNewVersion() }))
		),
		showBackButton ? div('icon back', button(function() { gScroller.pop() })) : div('logoIcon', logoIcon(32), button(searchButton.renderSearchInput)),
		div('title' + (isHome ? ' logo' : ''), view.title || logoName(60, 26, 'white')),
		searchButton.render()
	)
}

function scrollerRenderBodyContent(view, opts) {
	console.log("scroller.scrollerRenderBodyContent", JSON.stringify(view))
	var convo = view.conversation
	if (!convo) { return home.render(view) }
	return [
		conversation.render({
			accountId:convo.accountId,
			facebookId:convo.facebookId,
			messages:gState.cache[conversation.id(convo, 'messages')],
			myAccountId:gState.myAccount().accountId,
			height:viewport.height() - gScroller.$head.height(),
			refreshMessages:true
		}),
		composer.render({ accountId:convo.accountId, facebookId:convo.facebookId })
	]
}

events.on('searchButton.results', function(info) {
	if (info.showing) { $('.scroller-head').addClass('flat') }
	else { $('.scroller-head').removeClass('flat') }
})
