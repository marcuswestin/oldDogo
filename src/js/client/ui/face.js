var Addresses = require('data/Addresses')

var face = module.exports = function face(person, opts) {
	return getFace(person, opts)
}

face.mine = function myFace(opts) {
	return getFace(gState.me(), opts)
}

function getFace(person, opts) {
	var opts = tags.options(opts, {
		size:25,
		style:null,
		className:null,
		radius:null
	})
	return div('face',
		style({ width:opts.size, height:opts.size }),
		style(backgroundStyle(person, opts)),
		opts.style && style(opts.style)
	)
}

function backgroundStyle(person, opts) {
	var ratio = window.devicePixelRatio || 1
	var pixelSize = opts.size*ratio
	var imageUrl = getUrl(person, pixelSize)
	var params = { url:imageUrl, cache:'y', resize:pixelSize+'x'+pixelSize, mimeType:'image/jpeg' }
	if (opts.radius) { params.radius = opts.radius }
	return {
		background:'url('+BT.url('BTImage', 'fetchImage', params)+') rgba(240,240,255,.3) no-repeat',
		width:opts.size, height:opts.size, backgroundSize:px(opts.size, opts.size)
	}
}

function getUrl(person, pixelSize) {
	if (person.personId) {
		return '/pictures/person?personId='+person.personId
	} else if (person.type == Addresses.types.facebook) {
		return 'http://graph.facebook.com/'+person.address+'/picture'+(pixelSize > 50 ? '?type=large' : '')
	}
}
