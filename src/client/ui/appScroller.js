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
				? div('back', glyphish('xtras-white/36-circle-west', 28, 28, 8, 13, 9, 13), backIconDragger)
				: div('logoIcon', icon('logoIcon-32x32', 32, 32, 5, 10, 8, 10), logoIconDragger)
		),
		div('corner right',
			div('search', glyphish('white/112-group', 32, 21, 11, 8, 13, 12), searchIconDragger)
		)
	)
}

events.on('statusBar.wasTapped', function() {
	gScroller.getCurrentView().animate({ scrollTop:0 }, 300)
})

var cornerSize = { width:50, height:44 }

var backIconDragger = (function makeBackIconDragger() {
	return draggable({
		threshold:1,
		tap:function() {
			gScroller.pop()
		},
		start:function() {
			$('.corner.left').css(transition.none('width'))
			$('.corner.left .releaseUI').remove()
			$('.corner.left').append(
				div('releaseUI', 'Release to return', style({
					opacity:0,
					position:'absolute', top:9, left:8, color:'#fff', fontSize:16, textShadow:'0 1px 1px rgba(50,50,50,.5)'
				}))
			)
		},
		move:function(pos, history) {
			var marginToRightCorner = 6
			var maxWidth = viewport.width() - cornerSize.width - marginToRightCorner
			var width = cornerSize.width + pos.distance.x - getDampening(pos.distance.x)
			$('.corner.left').css({ width:clip(width, cornerSize.width, maxWidth) })
			var portion = width / maxWidth
			var startShowingAtPortion = .5
			
			if (lastMoveWasToTheRight(history) && portion > startShowingAtPortion) {
				var portionOfPortion = (portion - startShowingAtPortion) / startShowingAtPortion
				$('.corner.left .releaseUI')
					.css({ opacity:portionOfPortion })
					.css(transition.none('opacity'))
					.css(translate.x(35 * portionOfPortion))
			} else {
				$('.corner.left .releaseUI').css(transition('opacity', 200)).css({ opacity:0 })
			}
		},
		end:function(pos, history) {
			$('.corner.left .releaseUI').remove()
			if (lastMoveWasToTheRight(history) && pos.distance.x > 15) {
				gScroller.pop()
			} else {
				$('.corner.left').css(transition('width', 50)).css({ width:cornerSize.width })
			}
		}
	})
}())

function getDampening(dx) {
	return Math.round(dx * dx / 900) // gets stronger and stronger the larger dx is. Will need proper clamping for larger screens
}

var searchIconDragger = (function makeSearchIconDragger() {
	var margin = 6
	var textInputHeight = 36
	var maxCornerSize = { width:viewport.width(), height:viewport.height() - gKeyboardHeight }
	var maxTextInputWidth = maxCornerSize.width - cornerSize.width - margin * 2
	var textInputLeftOffset = cornerSize.width + margin
	var resultsBoxTop = textInputHeight + margin * 2
	var maxResultsBoxWidth = maxCornerSize.width - margin * 2
	var maxResultsBoxHeight = viewport.height() - gKeyboardHeight - resultsBoxTop - margin
	
	var currentCornerSize = cornerSize

	var duration = 150
	var animate = transition('width height', duration)
	var noAnimation = transition('width height', 0)
	
	function renderSearchUI() {
		$('.corner.right').css(noAnimation)
		$('.corner.right .searchUI').remove()
		$('.corner.right').append(
			div('searchUI', //style({ width:viewport.width(), height:viewport.height() - gKeyboardHeight, position:'absolute', top:0, right:0 }),
				div('textInput', style({
					position:'absolute', background:'white', height:textInputHeight, opacity:0,
					top:margin, left:textInputLeftOffset, borderRadius:px(2,3,1,2), width:maxTextInputWidth
				}))
				// div('resultsBox', style({
				// 	position:'absolute', background:'white', height:maxResultsBoxHeight, opacity:0,
				// 	top:resultsBoxTop, left:margin, borderRadius:px(2,1,3,3), width:maxResultsBoxWidth
				// }))
			)
		)
	}
	
	function showSearchUI() {
		$('.corner.right').css(animate).css(maxCornerSize)
		setTimeout(function() {
			var fade = transition('opacity', duration)
			$('.corner.right .textInput').css(fade).css({ opacity:1 })
			// $('.corner.right .resultsBox').css(fade).css({ opacity:1 })
			var fudge = 1
			bridge.command('textInput.show', {
				at:{ x:textInputLeftOffset, y:margin+fudge, width:maxTextInputWidth, height:textInputHeight+fudge },
				returnKeyType:'Go',
				font: { name:'Open Sans', size:16 },
				backgroundColor:[0,0,0,0]
			})
		}, duration)
		currentCornerSize = maxCornerSize
	}
	
	function hideSearchUI() {
		$('.corner.right .textInput').css({ opacity:0 })
		// $('.corner.right .resultsBox').css({ opacity:0 })
		$('.corner.right').css(animate).css(cornerSize)
		currentCornerSize = cornerSize
		bridge.command('textInput.hide')
	}
	
	return draggable({
		threshold:1,
		tap:function() {
			// searchButton.showSearchInput()
			if (currentCornerSize == maxCornerSize) {
				hideSearchUI()
			} else {
				renderSearchUI()
				showSearchUI()
			}
		},
		start:function() {
			renderSearchUI()
		},
		move:function(pos) {
			$('.corner.right').css({
				width: clip(currentCornerSize.width - pos.distance.x, cornerSize.width, viewport.width()),
				height: clip(currentCornerSize.height + pos.distance.y, cornerSize.height, maxCornerSize.height)
			})
				
			$('.corner.right .textInput').css({ width:clip(-pos.distance.x - margin * 2, 0, maxTextInputWidth) })
			// $('.corner.right .resultsBox').css({ width:clip(-pos.distance.x + cornerSize.width - margin * 2, cornerSize.width - margin * 2, maxResultsBoxWidth) })
		},
		end:showSearchUI
	})
}())

var logoIconDragger = draggable({
	threshold:1,
	tap:function() {
		updateAppBackground()
		showAppBackground()
	},
	start:function() {
		updateAppBackground()
	},
	move:function(pos) {
		var offset = clip(pos.distance.x, 0, appForegroundOffset)
		$('.appForeground').css(translate.x(offset, 0))
	},
	end:function(pos, history) {
		if (lastMoveWasToTheRight(history)) {
			showAppBackground()
		} else {
			$('.appForeground').css(translate.x(0, 200))
		}
	}
})

var foregroundOverlayDragger = draggable({
	threshold:1,
	start:function(pos) {},
	move:function(pos) {
		var offset = clip(appForegroundOffset + pos.distance.x, 0, appForegroundOffset)
		$('.appForeground').css(translate.x(offset, 0))
	},
	end:function(pos, history) {
		if (lastMoveWasToTheRight(history)) {
			$('.appForeground').css(translate.x(appForegroundOffset, 200))
		} else {
			hideAppBackground()
		}
	},
	tap:function(pos) {
		hideAppBackground()
	}
})

function lastMoveWasToTheRight(history) {
	for (var testPos, i=history.length-1; testPos=history[i]; i--) {
		if (testPos.change.x) {
			return testPos.change.x > 0
		}
	}
	return false
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
				position:'absolute', top:0, left:0, zIndex:3,
				width:appForegroundSliceWidth, height:viewport.height()
			}),
			foregroundOverlayDragger
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
