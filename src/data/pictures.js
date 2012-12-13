var isArray = require('std/isArray')

var pictures = module.exports = {
	url:url,
	urlFromMessage:urlFromMessage,
	path:path,
	sizedPath:sizedPath,
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

function url(conversationId, pictureSecret, size) {
	return base() + pictures.path(conversationId, pictureSecret, size)
}

function urlFromMessage(message, size) {
	return base() + pictures.path(message.conversationId, message.pictureSecret, size)
}

function path(conversationId, pictureSecret, size) {
	return 'conversation/'+conversationId+'/picture/'+pictureSecret+'.jpg'
}

function sizedPath(conversationId, pictureSecret, size) {
	if (typeof size == 'number') {
		size = [size, size]
	}
	return path(conversationId, pictureSecret).replace(/\.jpg$/, '_'+size[0]+'x'+size[1]+'.jpg')
}
