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
		radius:null
	})

	var ratio = window.devicePixelRatio || 1
	if (Addresses.isDogo(contact)) {
		var imageParams = { url:Payloads.personPictureUrl(contact.addressId) }
	} else if (contact.hasLocalImage) {
		var imageParams = { mediaModule:'BTAddressBook', mediaId:contact.localId }
	} else if (Addresses.isFacebook(contact)) {
		var imageParams = { url:face.facebookUrl(contact) }
	}
	
	if (imageParams) {
		imageParams.resize = opts.size*ratio+','+opts.size*ratio
		return graphics.backgroundImage(BT.url('BTImage.fetchImage', imageParams), opts.size, opts.size)
	} else {
		return null
	}
}

function getUrl(address) {
	if (address.personId) {
		return Payloads.personPictureUrl(address.personId)
	} else if (Addresses.isFacebook(address)) {
		return face.facebookUrl(address.addressId)
	}
}
