var face = module.exports = function face(person, opts) {
	return facebookFace(person, opts)
}

face.mine = function myFace(opts) {
	return facebookFace(gState.me(), opts)
}

function facebookFace(person, opts) {
	var facebookId = person.facebookId || person
	var opts = tags.options(opts, {
		size:25,
		style:null,
		className:null,
		radius:null
	})
	return div('face',
		style({ width:opts.size, height:opts.size }),
		style(backgroundStyle(facebookId, opts)),
		opts.style && style(opts.style)
	)
}

function backgroundStyle(facebookId, opts) {
	var ratio = window.devicePixelRatio || 1
	var pixelSize = opts.size*ratio
	var imageUrl = 'http://graph.facebook.com/'+facebookId+'/picture'+(pixelSize > 50 ? '?type=large' : '')
	var params = { url:imageUrl, cache:'y', resize:pixelSize+'x'+pixelSize, mimeType:'image/jpeg' }
	if (opts.radius) {
		params.radius = opts.radius
	}
	return {
		background:'url('+BT.url('BTImage', 'fetchImage', params)+') rgba(240,240,255,.3) no-repeat',
		width:opts.size, height:opts.size, backgroundSize:px(opts.size, opts.size)
	}
}
