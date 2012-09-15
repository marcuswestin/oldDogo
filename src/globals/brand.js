brandGradient = function(pos, amount) {
	if (!pos) { var where = 'center' }
	else { var where = (typeof pos == 'string' ? pos : (pos[0]+'px '+pos[1]+'px')) }
	return style({ background:'-webkit-radial-gradient('+where+', circle cover, #FFF4C4 0%, #FFB714 '+amount+'%)', width:'100%', height:'100%' })
}
