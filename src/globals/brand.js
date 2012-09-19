var ratio = (window.devicePixelRatio || 1)

brandGradient = function(pos, amount) {
	if (!pos) { var where = 'center' }
	else { var where = (typeof pos == 'string' ? pos : (pos[0]+'px '+pos[1]+'px')) }
	return style({ background:'-webkit-radial-gradient('+where+', circle cover, #FFF4C4 0%, #FFB714 '+amount+'%)', width:'100%', height:'100%' })
}

logoIcon = function(size) {
	if (!size) { size = 64 }
	return bgImg('logoIcon', size, size)
}

logoName = function(w, h, color) {
	if (!w) { w = 78 }
	if (!h) { h = 34 }
	return bgImg('logoName' + (color ? '-'+color : ''), w, h)
}

bgImg = function(name, w, h) {
	var imgUrl = '/static/img/'+name+'-'+(w*ratio)+'x'+(h*ratio)+'.png'
	return div('bgImg', style({
		width:w, height:h, display:'inline-block',
		background: 'url("'+imgUrl+'") transparent no-repeat',
		backgroundSize: w+'px '+h+'px'
	}))
}
