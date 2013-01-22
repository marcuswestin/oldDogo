var payloads = module.exports = {
	url:url,
	path:path,
	bucket:null,
	mimeTypes: {
		'picture':'image/jpg',
		'audio':'audio/mp4a-latm'
	}
}

var extensions = {
	'picture':'jpg',
	'audio':'m4a'
}

function path(conversationId, secret, type) {
	return '/conv/'+conversationId+'/payload/'+secret+'.'+extensions[type]
}

function url(conversationId, secret, type) {
	return base() + payloads.path(conversationId, secret, type)
}

function base() {
	return 'http://'+payloads.bucket+'.s3.amazonaws.com'
}
