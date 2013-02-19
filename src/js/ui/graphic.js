var graphics = module.exports = {
	url:url,
	background:background,
	base:'/graphics/'
}

var ratio = (window.devicePixelRatio || 1)
var scale = ratio > 1 ? '@2x' : ''

function url(name, width, height) {
	if (width && !height) { height = width }
	var size = width ? '-'+width+'x'+height : ''
	return graphics.base + name + size + scale + '.png'
}

function background(name, width, height) {
	return 'url('+graphics.url(name, width, height)+')'
}
