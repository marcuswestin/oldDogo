module.exports = gradient
gradient.radial = radialGradient

function gradient(from, to) {
	return '-webkit-linear-gradient('+from+', '+to+')'
}

function radialGradient(center, from, to, extent) {
	return '-webkit-radial-gradient('+center+', circle cover, '+from+' 0%, '+to+' '+extent+')'
}
