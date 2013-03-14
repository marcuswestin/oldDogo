var isArray = require('std/isArray')

module.exports = {
	displayUrl:displayUrl
}

function displayUrl(message, opts) {
	opts = tags.options(opts, {
		resize:null,
		crop:null
	})
	var params = {
		url:Payloads.url(message),
		cache:'yes',
		mimeType:'image/jpg'
	}
	if (opts.resize) {
		params.resize = fixSize(opts.resize).join(',') // e.g '200x300'
	}
	if (opts.crop) {
		params.crop = fixSize(opts.crop).join(',')
	}
	return BT.url('BTImage.fetchImage', params)
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