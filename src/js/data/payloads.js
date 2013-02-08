var payloads = module.exports = {
	url:url,
	path:path,
	personPicturePath:personPicturePath,
	personPictureUrl:personPictureUrl,
	underlyingPersonPicturePath:underlyingPersonPicturePath,
	underlyingPersonPictureUrl:underlyingPersonPictureUrl,
	base:base,
	configure:configure,
	mimeTypes: {
		'picture':'image/jpg',
		'audio':'audio/mp4a-latm'
	}
}

function configure(config) {
	payloads.bucket = config.bucket
	payloads.region = config.region
}

var extensions = {
	'picture':'jpg',
	'audio':'m4a'
}

function personPicturePath(personId) { return '/people/'+personId+'/picture' }
function personPictureUrl(personId) { return base() + personPicturePath(personId) }
function underlyingPersonPicturePath(secret) { return '/people/pictures/'+secret+'.'+extensions['picture'] }
function underlyingPersonPictureUrl(secret) { return base() + underlyingPersonPicturePath(secret) }

function path(personId, secret, type) {
	return '/people/'+(personId || 'guests')+'/payloads/'+secret+'.'+extensions[type]
}

function url(personId, type, payload) {
	return base(payload.bucket, payload.region) + payloads.path(personId, secret, type)
}

function base(bucket, region) {
	return 'http://'+(bucket || payloads.bucket)+'.s3-website-'+(region || payloads.region)+'.amazonaws.com'
}
