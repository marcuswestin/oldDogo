var payloads = require('data/payloads')

var face = module.exports = function face(person, opts) {
	return renderFace(person, opts)
}

face.mine = function myFace(opts) {
	return renderFace(gState.me(), opts)
}

function renderFace(person, opts) {
	return div('face', style(face.style(person, opts)), opts && opts.style && style(opts.style))
}

face.style = function(person, opts) {
	var opts = tags.options(opts, {
		size:25,
		radius:null
	})

	var ratio = window.devicePixelRatio || 1
	var pixelSize = opts.size*ratio
	var imageUrl = getUrl(person, pixelSize)
	var params = { url:imageUrl, cache:'y', resize:pixelSize+'x'+pixelSize, mimeType:'image/jpeg' }
	if (opts.radius) { params.radius = opts.radius }
	return {
		background:'url('+BT.url('BTImage', 'fetchImage', params)+') rgba(240,240,255,.3) no-repeat',
		width:opts.size, height:opts.size, backgroundSize:px(opts.size, opts.size), display:'inline-block'
	}
}

function getUrl(person, pixelSize) {
	if (person.personId) {
		return payloads.personPictureUrl(person.personId)
	} else if (Addresses.isFacebook(person)) {
		return 'http://graph.facebook.com/'+person.address+'/picture'+(pixelSize > 50 ? '?type=large' : '')
	}
}
