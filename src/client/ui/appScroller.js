var searchButton = require('./searchButton')
var home = require('./home')
var conversation = require('./conversation')
var composer = require('./composer')

module.exports = {
	createAndRender:createAndRenderScroller
}

function createAndRenderScroller() {
	gScroller = makeScroller({ onViewChange:function onViewChange() { events.fire('view.change') }, duration:300 })
	$('#viewport').prepend(div('dogoApp',
		gScroller.renderHead(gHeadHeight, renderScrollerHead),
		gScroller.renderBody(3, renderScrollerView)
	))
}

function renderScrollerHead(view, opts) {
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

function renderScrollerView(view, opts) {
	console.log("scroller.scrollerRenderBodyContent", JSON.stringify(view))
	if (view.conversation) {
		return [conversation.render(view), composer.render(view)]
	} else {
		return home.render(view)
	}
}

events.on('searchButton.results', function(info) {
	if (info.showing) { $('.tags-scroller-head').addClass('flat') }
	else { $('.tags-scroller-head').removeClass('flat') }
})
