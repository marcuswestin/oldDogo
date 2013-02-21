var face = module.exports = function face(person, opts) {
	return renderFace(person, opts, slice(arguments, 2))
}

face.mine = function myFace(opts) {
	return renderFace(gState.me(), opts, slice(arguments, 1))
}

face.facebookUrl = function(address) {
	return 'https://graph.facebook.com/'+(address.addressId || address)+'/picture?type=large'
}

function renderFace(person, opts, styles) {
	return div('face', style(face.style(person, opts)), style.apply(this, styles))
}

face.style = function(person, opts) {
	var opts = tags.options(opts, {
		size:unit * 3,
		radius:null
	})

	var ratio = window.devicePixelRatio || 1
	var pixelSize = opts.size*ratio
	var imageUrl = getUrl(person)
	var params = { url:imageUrl, cache:'y', resize:pixelSize+'x'+pixelSize, mimeType:'image/jpeg' }
	if (opts.radius) { params.radius = opts.radius }
	return {
		background:'url('+BT.url('BTImage', 'fetchImage', params)+') rgba(240,240,255,.3) no-repeat',
		width:opts.size, height:opts.size, backgroundSize:px(opts.size, opts.size)
	}
}

function getUrl(address) {
	if (address.personId) {
		return Payloads.personPictureUrl(address.personId)
	} else if (Addresses.isFacebook(address)) {
		return face.facebookUrl(address.addressId)
	}
}
