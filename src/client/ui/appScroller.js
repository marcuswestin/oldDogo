var searchButton = require('./searchButton')
var home = require('./home')
var conversation = require('./conversation')
var composer = require('./composer')
var appBackground = require('./appBackground')

module.exports = {
	createAndRender:createAndRenderScroller
}

function createAndRenderScroller() {
	gScroller = makeScroller({
		onViewChange:function onViewChange() { events.fire('view.change') },
		duration:300
	})
	$('#viewport').prepend(div('dogoApp', style(translate(0,0)),
		appBackground.render(),
		div('appForeground',
			gScroller.renderHead(gHeadHeight, renderScrollerHead),
			gScroller.renderBody(3, renderScrollerView),
			gScroller.renderFoot(renderScrollerFoot)
		)
	))
	
	// setTimeout(showAppBackground, 0) // AUTOS
}

function renderScrollerHead(view, opts) {
	var isHome = (gScroller.stack.length == 1)
	var stackIsAboveHome = (gScroller.stack.length > 1)
	var showBackButton = (opts.viewBelow && stackIsAboveHome)
	var title = null
	if (view.conversation) {
		var names = view.conversation.person.fullName.split(' ')
		title = names[0]
		if (names.length > 1) {
			title += ' ' + names[names.length-1][0] // first name plus first letter of last name
		}
	}
	return div('head', style(translate(0,0)),
		div('shadow', button(function() {
			gScroller.getCurrentView().animate({ scrollTop:0 }, 300)
		})),
		div('corner left',
			showBackButton
				? div('back', glyphish('xtras-white/36-circle-west', 28, 28, 6, 13, 9, 11), button(function() { gScroller.pop() }))
				: div('logoIcon', icon('logoIcon-32x32', 32, 32, 3, 10, 8, 10), button(showAppBackground))
		),
		div('corner right',
			searchButton.render()
		)
	)
}

events.on('statusBar.wasTapped', function() {
	gScroller.getCurrentView().animate({ scrollTop:0 }, 300)
})

function showAppBackground() {
	var logoIconSize = (32 + 6*2) // icon size + 6px margin on either side
	var xOffset = viewport.width() - logoIconSize
	$('.appForeground').css(style.translate.x(xOffset, 200))
	appBackground.update(viewport.width()-logoIconSize)
	$('#viewport').append(
		div('foregroundOverlay',
			style({ position:'absolute', top:0, right:0, width:logoIconSize, height:viewport.height() }),
			button(function() {
				$('.appForeground').css(style.translate.x(0, 200))
				$(this).remove()
			})
		)
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
