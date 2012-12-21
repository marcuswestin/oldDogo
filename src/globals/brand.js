var ext = window.devicePixelRatio > 1 ? '@'+window.devicePixelRatio+'x' : ''

brandGradient = function(pos, amount) {
	if (!pos) { var where = 'center' }
	else { var where = (typeof pos == 'string' ? pos : (pos[0]+'px '+pos[1]+'px')) }
	return style({ background:'-webkit-radial-gradient('+where+', circle cover, #FFF4C4 0%, #FFA714 '+amount+'%)', width:'100%', height:'100%' })
}

glyphish = function(name, width, height, paddingTop, paddingRight, paddingBottom, paddingLeft) {
	return icon('glyphish/'+name, width, height, paddingTop, paddingRight, paddingBottom, paddingLeft)
}

icon = function(name, width, height, paddingTop, paddingRight, paddingBottom, paddingLeft) {
	if (paddingTop == null) { paddingTop = 0 }
	if (paddingRight == null) { paddingRight = 0 }
	if (paddingBottom == null) { paddingBottom = paddingTop }
	if (paddingLeft == null) { paddingLeft = paddingRight }
	return div('icon', style({
		width:width,
		height:height,
		background:'transparent '+paddingLeft+'px '+paddingTop+'px no-repeat',
		backgroundImage:image.backgroundUrl(name),
		backgroundSize:width+'px '+height+'px',
		padding:paddingTop+'px '+paddingRight+'px '+paddingBottom+'px '+paddingLeft+'px'
	}))
}

image = (function() {
	function imageUrl(name) {
		return image.base + name + '@2x.png'
	}
	function backgroundUrl(name) {
		return 'url("'+imageUrl(name)+'")'
	}
	return {
		base: '/graphics/',
		url: imageUrl,
		backgroundUrl: backgroundUrl
	}
}())
