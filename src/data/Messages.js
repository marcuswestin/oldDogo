var makeEncoder = require('./makeEncoder')

module.exports = {
	types:getTypes(),
	payload:getPayload()
}

function getFields() {}

function getTypes() {
	var types = {
		'text':1,
		'picture':2,
		'audio':3
	}
	types.reverse = makeEncoder.reverseFields(types)
	return types
}

function getPayload() {
	var textEncoder = makeEncoder({
		'body':'b'
	})
	var pictureEncoder = makeEncoder({
		'secret':'s',
		'width':'w',
		'height':'h'
	})
	var audioEncoder = makeEncoder({
		'secret':'s',
		'duration':'d'
	})
	return {
		text:textEncoder,
		picture:pictureEncoder,
		audio:audioEncoder,
		cleanForUpload:cleanPayloadForUpload
	}
}

function cleanPayloadForUpload(type, payload) {
	if (type == 'picture') {
		if (!payload.width || !payload.height) { return null }
		return { secret:payload.secret, width:payload.width, height:payload.height }
	} else if (type == 'text') {
		if (!payload.body) { return null }
		return { body:payload.body }
	} else if (type == 'audio') {
		if (!payload.duration) { return null }
		return { duration:payload.duration }
	}
	return null
}
