var isArray = require('std/isArray')

var pictures = module.exports = {
	rawUrl:rawUrl,
	displayUrl:displayUrl,
	path:path,
	bucket:null
}

// pictures.display = {
// 	conversationPreview:200,
// 	homePreview:
// 	thumb:200
// }
// pictures.pixels = {}
// each(pictures.display, function(size, name) {
// 	pictures.pixels[name] = size * 2 // Retina displays
// })
// 
function base() {
	return 'http://'+pictures.bucket+'.s3.amazonaws.com/'
}

function rawUrl(conversationId, pictureSecret, size) {
	return base() + pictures.path(conversationId, pictureSecret, size)
}

function displayUrl(message, opts) {
	opts = tags.options(opts, {
		resize:null,
		crop:null
	})
	var url = rawUrl(message.conversationId, message.payload.secret)
	var params = {
		url:url,
		cache:'yes',
		mimeType:'image/jpg'
	}
	if (opts.resize) {
		params.resize = fixSize(opts.resize).join('x') // e.g '200x300'
	}
	if (opts.crop) {
		params.crop = fixSize(opts.crop).join('x')
	}
	return BT.url('BTImage', 'fetchImage', params)
}

function path(conversationId, pictureSecret, size) {
	var path = 'conversation/'+conversationId+'/picture/'+pictureSecret+'.jpg'
	size = fixSize(size)
	if (size) {
		return path.replace(/\.jpg$/, '_'+size[0]+'x'+size[1]+'.jpg')
	} else {
		return path
	}
}

function fixSize(size) {
	if (size == undefined) {
		return null
	}
	
	if (typeof size == 'string') {
		size = parseInt(size)
	}
	
	if (typeof size == 'number') {
		return [size, size]
	} else {
		return size
	}
}
