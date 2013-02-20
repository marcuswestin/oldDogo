var graphics = module.exports = {
	url:url,
	background:background,
	graphic:graphic,
	base:'/graphics/'
}

var ratio = 2//(window.devicePixelRatio || 1)
var scale = ratio > 1 ? '@2x' : ''

function url(name, width, height) {
	if (width && !height) { height = width }
	var size = width ? '-'+width+'x'+height : ''
	return graphics.base + name + size + scale + '.png'
}

function background(name, width, height, offsetX, offsetY) {
	return {
		background:'transparent '+(offsetX || 0)+'px '+(offsetY || 0)+'px no-repeat',
		backgroundImage:'url('+graphics.url(name, width, height)+')',
		backgroundSize:px(width, height)
	}
}

function graphic(name, width, height) {
	// if (paddingTop == null) { paddingTop = 0 }
	// if (paddingRight == null) { paddingRight = 0 }
	// if (paddingBottom == null) { paddingBottom = paddingTop }
	// if (paddingLeft == null) { paddingLeft = paddingRight }
	var styles = slice(arguments, 3)
	return div(style(graphics.background(name, width, height), {
		display:'inline-block',
		width:width,
		height:height,
		// padding:px(paddingTop, paddingRight, paddingBottom, paddingLeft)
	}), styles && style.apply(this, styles))
}
