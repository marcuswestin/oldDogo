var ext = window.devicePixelRatio > 1 ? '@'+window.devicePixelRatio+'x' : ''

brandGradient = function(pos, amount) {
	if (!pos) { var where = 'center' }
	else { var where = (typeof pos == 'string' ? pos : (pos[0]+'px '+pos[1]+'px')) }
	return style({ background:'-webkit-radial-gradient('+where+', circle cover, #FFF 0%, #30A4FF '+amount+'%)', width:'100%', height:'100%' })
}

icon = function(name, width, height, paddingTop, paddingRight, paddingBottom, paddingLeft) {
	if (paddingTop == null) { paddingTop = 0 }
	if (paddingRight == null) { paddingRight = 0 }
	if (paddingBottom == null) { paddingBottom = paddingTop }
	if (paddingLeft == null) { paddingLeft = paddingRight }
	return div('icon', style({
		width:width,
		height:height,
		background:'transparent '+px(paddingLeft, paddingTop)+' no-repeat',
		backgroundImage:image.background(name, width, height),
		backgroundSize:px(width, height),
		padding:px(paddingTop, paddingRight, paddingBottom, paddingLeft)
	}))
}

icon.preload = function(icons) {
	var result = {}
	var cache = {}
	events.on('appScroller.rendered', function() {
		if (!$('#preloadDiv')[0]) {
			$('#dogoApp').append(div({ id:'preloadDiv' }, style({ position:'absolute', top:-9999, left:-9999 })))
		}
		each(icons, function(iconArgs, name) {
			cache[name] = icon.apply(this, iconArgs)
			$('#preloadDiv').append(cache[name])
			result[name] = function() {
				var id = tags.id()
				setTimeout(function() {
					$('#'+id).replaceWith(cache[name])
				})
				return div('icon', { id:id })
			}
		})
	})
	return result
}

image = (function() {
	function imageUrl(name, width, height) {
		if (width && !height) { height = width }
		var size = width ? '-'+width+'x'+height : ''
		return image.base + name + size + '@2x.png'
	}
	function background(name, width, height, atOneX) {
		return 'url('+imageUrl(name, width, height)+')'
	}
	return {
		base: '/graphics/',
		url: imageUrl,
		background: background
	}
}())
