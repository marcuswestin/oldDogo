var ext = window.devicePixelRatio > 1 ? '@'+window.devicePixelRatio+'x' : ''

brandGradient = function(pos, amount) {
	if (!pos) { var where = 'center' }
	else { var where = (typeof pos == 'string' ? pos : (pos[0]+'px '+pos[1]+'px')) }
	return style({ background:'-webkit-radial-gradient('+where+', circle cover, #FFF4C4 0%, #FFA714 '+amount+'%)', width:'100%', height:'100%' })
}

logoIcon = function(size) {
	if (!size) { size = 32 }
	return bgImg('logoIcon', size, size)
}

logoName = function(w, h, color) {
	if (!w) { w = 78 }
	if (!h) { h = 34 }
	return bgImg('logoName' + (color ? '-'+color : ''), w, h)
}

bgImg = function(name, w, h) {
	var imgUrl = image.url(name+'-'+w+'x'+h)
	return div('bgImg', style({
		width:w, height:h, display:'inline-block',
		background: 'url("'+imgUrl+'") transparent no-repeat',
		backgroundSize: w+'px '+h+'px'
	}))
}

icon = function(width, height, name, paddingTop, paddingRight, paddingBottom, paddingLeft) {
	if (paddingTop == null) { paddingTop = 0 }
	if (paddingRight == null) { paddingRight = 0 }
	if (paddingBottom == null) { paddingBottom = paddingTop }
	if (paddingLeft == null) { paddingLeft = paddingRight }
	return div('icon', style({
		width:width,
		height:height,
		background:'transparent '+paddingLeft+'px '+paddingTop+'px no-repeat',
		backgroundImage:image.backgroundUrl('glyphish/'+name),
		backgroundSize:width+'px '+height+'px',
		padding:paddingTop+'px '+paddingRight+'px '+paddingBottom+'px '+paddingLeft+'px'
	}))
}
