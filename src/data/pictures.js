var isArray = require('std/isArray')

var pictures = module.exports = {
	url:url,
	urlFromMessage:urlFromMessage,
	path:path,
	bucket:null
}

pictures.display = {
	thumb:276
}
pictures.pixels = {}
each(pictures.display, function(size, name) {
	pictures.pixels[name] = size * 2 // Retina displays
})

function base() {
	return 'http://'+pictures.bucket+'.s3.amazonaws.com/'
}

function url(conversationId, pictureSecret, size) {
	return base() + path(conversationId, pictureSecret, size)
}

function urlFromMessage(message, size) {
	return base() + path(message.conversationId, message.pictureSecret, size)
}

function path(conversationId, pictureSecret, size) {
	var path = 'conversation/'+conversationId+'/picture/'+pictureSecret
	var ext = '.jpg'
	if (isArray(size)) {
		return path+'_'+size[0]+'x'+size[1]+ext
	} else if (typeof size == 'number') {
		return path+'_'+size+'x'+size+ext
	} else {
		return path+ext
	}
}
