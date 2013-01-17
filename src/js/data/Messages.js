var makeEncoder = require('./makeEncoder')

module.exports = {
	types:getTypes(),
	payload:getPayload()
}

function getFields() {}

function getTypes() {
	var types = {
		'text':1,
		'picture':2
	}
	types.reverse = makeEncoder.reverseFields(types)
	return types
}

function getPayload() {
	function verifyPayload(type, payload) {
		if (type == 'picture') {
			if ((!payload.secret && !payload.base64Data) || !payload.width || !payload.height) {
				return false
			}
		} else if (type == 'text') {
			if (!payload.body) {
				return false
			}
		} else {
			return false
		}
		return true
	}
	
	var textEncoder = makeEncoder({
		'body':'b'
	})
	var pictureEncoder = makeEncoder({
		'secret':'s',
		'width':'w',
		'height':'h'
	})
	return {
		text:textEncoder,
		picture:pictureEncoder,
		verify:verifyPayload
	}
}
