var searchButton = require('./searchButton')
var home = require('./home')
var conversation = require('./conversation')
var composer = require('./composer')
var appBackground = require('./appBackground')
var clip = require('std/clip')

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
		div('appForeground', style(translate(0,0)),
			gScroller.renderHead(gHeadHeight, renderScrollerHead),
			gScroller.renderBody(3, renderScrollerView),
			gScroller.renderFoot(renderScrollerFoot)
		)
	))
	
	// setTimeout(function() { updateAppBackground(); showAppBackground() }, 0) // AUTOS
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
				: div('logoIcon', icon('logoIcon-32x32', 32, 32, 3, 10, 8, 10), draggable({
					threshold:1,
					tap:function() {
						updateAppBackground()
						showAppBackground()
					},
					start:function() {
						updateAppBackground()
					},
					move:function(pos) {
						var offset = clip(pos.dx, 0, appForegroundOffset)
						$('.appForeground').css(translate.x(offset, 0))
					},
					end:function(pos) {
						if (lastMoveWasToTheRight(pos)) {
							showAppBackground()
						} else {
							$('.appForeground').css(translate.x(0, 200))
						}
					}
				}))
		),
		div('corner right',
			searchButton.render()
		)
	)
}

events.on('statusBar.wasTapped', function() {
	gScroller.getCurrentView().animate({ scrollTop:0 }, 300)
})

function lastMoveWasToTheRight(pos) {
	var lastHorizontalMove
	for (var testPos, i=pos.history.length-1; testPos=pos.history[i]; i--) {
		if (testPos.x == pos.x) { continue }
		lastHorizontalMove = testPos
		break
	}
	return (lastHorizontalMove && (lastHorizontalMove.x < pos.x))
}

var appForegroundSliceWidth = 50
var appForegroundOffset = viewport.width() - appForegroundSliceWidth
function updateAppBackground() {
	appBackground.update(viewport.width() - appForegroundSliceWidth)
}

function showAppBackground() {
	$('.appForeground').css(style.translate.x(appForegroundOffset, 200)).append(
		div('foregroundOverlay',
			style({
				position:'absolute', top:0, left:0,
				width:appForegroundSliceWidth, height:viewport.height()
			}),
			draggable({
				threshold:1,
				start:function(pos) {},
				move:function(pos) {
					var offset = clip(appForegroundOffset + pos.dx, 0, appForegroundOffset)
					$('.appForeground').css(translate.x(offset, 0))
				},
				end:function(pos) {
					if (lastMoveWasToTheRight(pos)) {
						$('.appForeground').css(translate.x(appForegroundOffset, 200))
					} else {
						hideAppBackground()
					}
				},
				tap:function(pos) {
					hideAppBackground()
				}
			})
		)
	)
}

function hideAppBackground() {
	$('.appForeground').css(style.translate.x(0, 200))
	setTimeout(function() {
		$('.foregroundOverlay').remove()
	}, 200)
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
