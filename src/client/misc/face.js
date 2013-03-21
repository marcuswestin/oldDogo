var face = module.exports = function face(person, opts) {
	return renderFace(person, opts, slice(arguments, 2))
}

face.mine = function myFace(opts) {
	return renderFace(gState.me(), opts, slice(arguments, 1))
}

face.facebookUrl = function(address) {
	return gConfig.protocol+'//graph.facebook.com/'+(address.addressId || address)+'/picture?type=large'
}

function renderFace(person, opts, styles) {
	return div('face', style(face.style(person, opts)), style.apply(this, styles))
}

face.style = function(contact, opts) {
	opts = options(opts, {
		size:unit * 6,
		width:null,
		height:null,
		radius:null
	})
	if (!opts.width) { opts.width = opts.size }
	if (!opts.height) { opts.height = opts.size }

	if (Addresses.isDogo(contact)) {
		var imageParams = { url:Payloads.personPictureUrl(contact.addressId) }
	} else if (contact.hasLocalImage) {
		var imageParams = { mediaModule:'BTAddressBook', mediaId:contact.localId }
	} else if (Addresses.isFacebook(contact)) {
		var imageParams = { url:face.facebookUrl(contact) }
	}
	
	if (imageParams) {
		imageParams.resize = opts.width*resolution+','+opts.height*resolution
		return $.extend(graphics.backgroundImage(BT.url('BTImage.fetchImage', imageParams), opts.width, opts.height, { background:'rgb(235,245,255)' }), { width:opts.width, height:opts.height })
	} else {
		return { width:opts.width, height:opts.height, background:opts.background || 'rgb(220,237,246)' }
	}
}

function getUrl(address) {
	if (address.personId) {
		return Payloads.personPictureUrl(address.personId)
	} else if (Addresses.isFacebook(address)) {
		return face.facebookUrl(address.addressId)
	}
}
