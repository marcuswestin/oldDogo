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
	types.reverse = {}
	each(types, function(encoding, name) {
		if (types.reverse[encoding]) { throw new Error('Duplicate type encoding!') }
		types.reverse[encoding] = name
	})
	return types
}

function getPayload() {
	var fields = {
		text: {
			'body':'b'
		},
		picture: {
			'secret':'s',
			'width':'w',
			'height':'h'
		}
	}
	var reverse = {}
	each(fields, function(typeFields, typeName) {
		reverse[typeName] = {}
		each(typeFields, function(encoding, name) {
			if (reverse[typeName][encoding]) { throw new Error("Duplicate encoding! " + encoding) }
			reverse[typeName][encoding] = name
		})
	})
	fields.reverse = reverse
	
	function verifyPayload(type, payload) {
		if (type == 'picture') {
			if (!payload.secret || !payload.width || !payload.height) {
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
	
	return { fields:fields, encode:makeEncoder(fields), decode:makeEncoder(fields.reverse), verify:verifyPayload }
}

function makeEncoder(fields) {
	return function encoder(type, data) {
		var typeFields = fields[type]
		var res = {}
		for (var key in data) {
			res[typeFields[key]] = data[key]
		}
		return res
	}
}
