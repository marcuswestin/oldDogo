brandGradient = function(amount, pos) {
	var where = pos ? (pos[0]+'px '+pos[1]+'px') : 'center'
	return style({ background:'-webkit-radial-gradient('+where+', circle cover, #FFF4C4 0%, #FAB347 '+amount+'%)', width:'100%', height:'100%' })
}
