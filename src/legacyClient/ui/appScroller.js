var searchResults = require('./searchButton')
var home = require('./home')
var conversation = require('./conversation')
var composer = require('./composer')
var appBackground = require('./appBackground')

module.exports = {
	createAndRender:createAndRenderScroller
}

var icons = icon.preload({
	back: ['glyphish/xtras-white/36-circle-west', 28, 28, 8, 12, 6, 11],
	menu: ['glyphish/white/19-gear', 26, 26, 7, 9],
	// search: ['glyphish/white/112-group', 32, 21, 11, 8, 13, 12]
	search: ['glyphish/white/06-magnify', 24, 24, 10, 14]
})

function createAndRenderScroller() {
	gScroller = makeScroller({
		numViews:2,
		onViewChanging:function onViewChanging() { events.fire('view.changing') },
		duration:300,
		renderHead:renderScrollerHead,
		renderView:renderScrollerView,
		renderFoot:renderScrollerFoot
	})
	
	$('#appContainer').prepend(div({ id:'dogoApp' }, style(translate(0,0,1)),
		appBackground.render(),
		div('appForeground', style(translate(0,0)), gScroller)
	))
	
	// setTimeout(function() { updateAppBackground(); showAppBackground() }, 0) // AUTOS
	
	events.fire('appScroller.rendered')
	
	function renderScrollerHead(view, opts) {
		var isHome = (gScroller.stack.length == 1)
		var stackIsAboveHome = (gScroller.stack.length > 1)
		var showBackButton = (opts.viewBelow && stackIsAboveHome)
		var cornerMargin = { top:20 + spacing/2, side:spacing/2 }
		var title = null
		if (view.conversation) {
			var names = view.conversation.people[0].name.split(' ')
			title = names[0]
			if (names.length > 1) {
				title += ' ' + names[names.length-1][0] // first name plus first letter of last name
			}
		}
		return div('head', style(translate(0,0)),
			div('corner left', style({ borderRadius:leftCornerRadius }),
				style(translate(cornerMargin.side, cornerMargin.top)),
				style(cornerSize),
				showBackButton
					? div('back', icons.back, backIconDragger)
					: div('listMenu', icons.menu, logoIconDragger)
			),
			div('corner right', style({ borderRadius:rightCornerRadius }),
				style(translate(viewport.width() - cornerSize.width - cornerMargin.side, cornerMargin.top)),
				style(cornerSize),
				div('search', icons.search, searchIconDragger)
			)
		)
	}
}

events.on('statusBar.wasTapped', function() {
	$(gScroller.getView()).animate({ scrollTop:0 }, 300)
})

var cornerSize = { width:48, height:44 }
var leftCornerRadius = px(6)//px(6,0,3,0)
var rightCornerRadius = px(6)//px(0,6,0,3)

var backIconDragger = (function makeBackIconDragger() {
	function getDampening(dx) {
		return Math.round(dx * dx / 650) // gets stronger and stronger the larger dx is. Will need proper clamping for larger screens
	}
	
	function cancel() {
		$('.corner.left').css(transition('width', 50)).css({ width:cornerSize.width })
		$('.corner.left .releaseUI').css({ opacity:0 })
	}
	
	function goBack() {
		home.reload() // this is a bit silly, but for now it's a fine way to get the home screan to reload its data
		gScroller.pop()
	}
	
	return cornerDragger('left', {
		threshold:2,
		tap:function() {
			goBack()
		},
		start:function() {
			$('.corner.left').css(transition.none())
			$('.corner.left .releaseUI').remove()
			$('.corner.left').append(
				div('releaseUI', 'Release to return', style({
					opacity:0, whiteSpace:'nowrap', fontWeight:'normal',
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
			var startShowingAtPortion = .45
			
			if (lastMoveWasToTheRight(history) && portion > startShowingAtPortion) {
				var portionOfPortion = (portion - startShowingAtPortion) / startShowingAtPortion
				$('.corner.left .releaseUI')
					.css({ opacity:portionOfPortion })
					.css(transition.none())
					.css(translate.x(30 * portionOfPortion))
			} else {
				$('.corner.left .releaseUI').css(transition('opacity', 200)).css({ opacity:0 })
			}
		},
		cancel:function() {
			cancel()
		},
		end:function(pos, history) {
			$('.corner.left .releaseUI').remove()
			if (lastMoveWasToTheRight(history) && pos.distance.x > 15) {
				goBack()
			} else {
				cancel()
			}
		}
	})
}())

var searchIconDragger = (function makeSearchIconDragger() {
	var margin = 5
	var textInputHeight = 36
	
	var cornersOffset = 4
	var statusBarHeight = 20
	var maxCornerSize = { width:viewport.width() - cornersOffset*2, height:viewport.height() - (statusBarHeight + cornersOffset*2) }
	var maxTextInputWidth = maxCornerSize.width - cornerSize.width * 2 - margin * 2
	var textInputLeftOffset = cornerSize.width + margin + cornersOffset
	var resultsBoxTop = textInputHeight + margin * 2 + 2
	var maxResultsBoxWidth = maxCornerSize.width
	var maxResultsBoxHeight = viewport.height() - resultsBoxTop
	
	var currentCornerSize = cornerSize

	var duration = 250
	var animate = transition({ height:duration, width:duration, '-webkit-transform':duration })
	var noAnimation = transition({ height:0, width:0, '-webkit-transform':0 })
	var fade = transition('opacity', duration)
	
	function renderSearchUI() {
		$('.corner.right').css(noAnimation)
		$('.corner.right .searchUI').remove()
		$('.corner.right').append(
			div('searchUI', //style({ width:viewport.width(), height:viewport.height() - gKeyboardHeight, position:'absolute', top:0, right:0 }),
				div('textInput',
					style({
						position:'absolute', background:'white', height:textInputHeight,
						top:margin, left:textInputLeftOffset, borderRadius:px(3,3,3,3), width:maxTextInputWidth
					}),
					button(function() {
						bridge.command('textInput.show', {
							at:{ x:textInputLeftOffset+cornersOffset, y:margin+statusBarHeight+cornersOffset+2, width:maxTextInputWidth, height:textInputHeight },
							returnKeyType:'Go',
							font: { name:'Open Sans', size:16 },
							backgroundColor:[0,0,0,0],
							preventWebviewShift:true
						})
					})
				),
				div('closeButton', icon('icon-circlex', 22, 23, 12, 16, 10, 16), style(translate.x(viewport.width() - 54)), button(function() {
					hideSearchUI()
				})),
				div('resultsBox', style(style.scrollable.y), style({
					position:'absolute', height:maxResultsBoxHeight, opacity:0,
					top:resultsBoxTop, width:maxResultsBoxWidth
				}))
			)
		)
	}
	
	function showSearchUI() {
		$('.corner.right').css(animate).css({
			width:maxCornerSize.width,
			height:maxCornerSize.height,
			borderRadius:0
		}).css(translate(cornersOffset, cornersOffset+statusBarHeight))
		$('.corner.right .textInput').css({ width:maxTextInputWidth })
		setTimeout(function() {
			setTimeout(function() {
				$('.corner.right .resultsBox').append(searchResults.render())
				$('.corner.right .resultsBox').css(fade).css({ opacity:1 })
			}, duration)
		}, duration)
		currentCornerSize = maxCornerSize
		
		events.once('keyboard.willHide', hideSearchUI)
	}
	
	function hideSearchUI() {
		$('.corner.right .textInput').css(fade).css({ opacity:0 })
		// $('.corner.right .resultsBox').css({ opacity:0 })
		$('.corner.right').css(animate).css({
			// width:cornerSize.width,
			height:cornerSize.height,
			borderRadius:rightCornerRadius
		}).css(translate(viewport.width()-cornerSize.width-cornersOffset, cornersOffset+statusBarHeight))
		setTimeout(function(duration) {
			$('.corner.right').css({ width:cornerSize.width })
			$('.corner.right .searchUI').remove()
		}, duration)
		currentCornerSize = cornerSize
		bridge.command('textInput.hide')
	}
	
	return cornerDragger('right', {
		threshold:2,
		tap:function() {
			if (currentCornerSize == maxCornerSize) {
				hideSearchUI()
			} else {
				renderSearchUI()
				showSearchUI()
			}
		},
		start:function() {
			if (currentCornerSize == cornerSize) {
				renderSearchUI()
			}
		},
		move:function(pos) {
			var offset = clip(maxCornerSize.width - currentCornerSize.width + pos.distance.x, cornersOffset, maxCornerSize.width - cornerSize.width - cornersOffset)
			var width = clip(currentCornerSize.width - pos.distance.x, cornerSize.width, maxCornerSize.width)
			$('.corner.right').css(translate(offset, cornersOffset + statusBarHeight, 0)).css({ width:width })
			// $('.corner.right .textInput').css({ width:clip(-pos.distance.x - margin * 2, 0, maxTextInputWidth) })
			// $('.corner.right .resultsBox').css({ width:clip(-pos.distance.x + cornerSize.width - margin * 2, cornerSize.width - margin * 2, maxResultsBoxWidth) })
		},
		end:function(pos, history, $e) {
			if (lastMoveWasToTheRight(history)) {
				hideSearchUI()
			} else {
				showSearchUI()
			}
		}
	})
}())

function cornerDragger(corner, opts) {
	opts.down = function() { $('.corner.'+corner).addClass('active') }
	opts.up = function() { $('.corner.'+corner).removeClass('active') }
	return draggable(opts)
}

var logoIconDragger = cornerDragger('left', {
	threshold:2,
	tap:function() {
		updateAppBackground()
		showAppBackground()
	},
	start:function() {
		updateAppBackground()
		$('.appBackground').css(transition.none()).css({ opacity:0 })
	},
	move:function(pos) {
		var offset = clip(pos.distance.x, 0, appForegroundOffset)
		$('.appForeground').css(translate.x(offset, 0))
		var portion = pos.distance.x / appForegroundOffset
		$('.appBackground').css({ opacity:portion })
	},
	end:function(pos, history) {
		if (lastMoveWasToTheRight(history)) {
			showAppBackground()
		} else {
			$('.appForeground').css(translate.x(0, 200))
		}
	}
})

var foregroundOverlayDragger = cornerDragger('left', {
	threshold:2,
	start:function(pos) {
		$('.appBackground').css(transition.none())
	},
	move:function(pos) {
		var offset = clip(appForegroundOffset + pos.distance.x, 0, appForegroundOffset)
		$('.appForeground').css(translate.x(offset, 0))
		var portion = -pos.distance.x / appForegroundOffset
		$('.appBackground').css({ opacity:1-portion })
	},
	end:function(pos, history) {
		if (lastMoveWasToTheRight(history)) {
			$('.appBackground').css({ opacity:1 })
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
	$('.appBackground').css(transition('opacity', 200)).css({ opacity:1 })
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
	$('.appBackground').css(transition('opacity', 200)).css({ opacity:0 })
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