var payloads = module.exports = {
	url:url,
	path:path,
	bucket:null,
	personPicturePath:personPicturePath,
	personPictureUrl:personPictureUrl,
	base:base,
	s3Region:'us-east-1', //'us-west-1',
	mimeTypes: {
		'picture':'image/jpg',
		'audio':'audio/mp4a-latm'
	}
}

var extensions = {
	'picture':'jpg',
	'audio':'m4a'
}

function personPicturePath(personId) { return '/people/'+personId+'/picture' }
function personPictureUrl(personId) { return base() + personPicturePath(personId) }

function path(personId, secret, type) {
	return '/people/'+(personId || 'guests')+'/payloads/'+secret+'.'+extensions[type]
}

function url(personId, secret, type) {
	return base() + payloads.path(personId, secret, type)
}

function base() {
	return 'http://'+payloads.bucket+'.s3-website-'+payloads.s3Region+'.amazonaws.com'
}
