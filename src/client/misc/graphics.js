var graphics = module.exports = {
	url:url,
	background:background,
	backgroundImage:backgroundImage,
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

function backgroundImage(url, width, height, opts) {
	var opts = options(opts, { offsetX:0, offsetY:0, repeat:'no-repeat', background:'transparent' })
	return {
		background:opts.background+' '+opts.offsetX+'px '+opts.offsetY+'px '+opts.repeat,
		backgroundImage:'url('+url+')',
		backgroundSize:px(width, height),
		width:width,
		height:height
	}
}

function background(name, width, height, opts) {
	return graphics.backgroundImage(graphics.url(name, width, height), width, height, opts)
}

function graphic(name, width, height) {
	// if (paddingTop == null) { paddingTop = 0 }
	// if (paddingRight == null) { paddingRight = 0 }
	// if (paddingBottom == null) { paddingBottom = paddingTop }
	// if (paddingLeft == null) { paddingLeft = paddingRight }
	var styles = slice(arguments, 3)
	return div(style(graphics.background(name, width, height), {
		display:'inline-block'
		// padding:px(paddingTop, paddingRight, paddingBottom, paddingLeft)
	}), styles && style.apply(this, styles))
}
