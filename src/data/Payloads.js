var Messages = require('data/Messages')

var payloads = module.exports = {
	url:url,
	path:path,
	personPicturePath:personPicturePath,
	personPictureUrl:personPictureUrl,
	underlyingPersonPicturePath:underlyingPersonPicturePath,
	underlyingPersonPictureUrl:underlyingPersonPictureUrl,
	base:base,
	configure:configure,
	mimeTypes:_getMimeTypes()
}

function _getMimeTypes() {
	var mimeTypes = {}
	mimeTypes[Messages.types.picture] = 'image/jpg'
	mimeTypes[Messages.types.audio] = 'audio/mp4a-latm'
	return mimeTypes
}

function configure(config) {
	payloads.bucket = config.bucket
	payloads.region = config.region
}

var extensions = {}
extensions[Messages.types.picture] = 'jpg'
extensions[Messages.types.audio] = 'm4a'

function personPicturePath(personId) { return '/people/'+personId+'/picture' }
function personPictureUrl(personId) { return base() + personPicturePath(personId) }
function underlyingPersonPicturePath(secret) { return '/people/pictures/'+secret+'.'+extensions[Messages.types.picture] }
function underlyingPersonPictureUrl(secret) { return base() + underlyingPersonPicturePath(secret) }

function path(personId, secret, type) {
	return '/people/'+(personId || 'guests')+'/payloads/'+secret+'.'+extensions[type]
}

function url(personId, type, payload) {
	return base(payload.bucket, payload.region) + payloads.path(personId, payload.secret, type)
}

function base(bucket, region) {
	return 'http://'+(bucket || payloads.bucket)+'.s3-website-'+(region || payloads.region)+'.amazonaws.com'
}
