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
		gScroller.renderBody(3, renderScrollerView),
		gScroller.renderFoot(renderScrollerFoot)
	))
}

function renderScrollerHead(view, opts) {
	var isHome = (gScroller.stack.length == 1)
	var stackIsAboveHome = (gScroller.stack.length > 1)
	var showBackButton = (opts.viewBelow && stackIsAboveHome)
	var title = null
	if (view.conversation) {
		var names = view.conversation.person.fullName.split(' ')
		if (names.length < 2) { return names[0] }
		title = names[0] + ' ' + names[names.length-1][0] // first name plus first letter of last name
	}
	return div('head',
		(appInfo.config.mode == 'dev') && div('devBar',
			div('button', 'R', button(function() { bridge.command('app.restart') })),
			div('button', 'X', button(function() { gState.clear(); bridge.command('app.restart') })),
			div('button', 'U', button(function() { gState.checkNewVersion() }))
		),
		showBackButton ? div('back', icon(28, 28, 'xtras-white/36-circle-west', 8, 8), button(function() { gScroller.pop() })) : div('logoIcon', logoIcon(32), button(searchButton.renderSearchInput)),
		div('title', title || div('logo', logoName(60, 26, 'white'))),
		searchButton.render()
	)
}

function renderScrollerView(view, opts) {
	if (view.conversation) {
		return conversation.render(view)
	} else {
		return home.render(view)
	}
}

function renderScrollerFoot(view, opts) {
	if (view.conversation) {
		return composer.render(view)
	}
}

events.on('searchButton.results', function(info) {
	if (info.showing) { $('.tags-scroller-head').addClass('flat') }
	else { $('.tags-scroller-head').removeClass('flat') }
})
