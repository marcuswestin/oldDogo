module.exports = {
	encodeMessage:encodeMessage,
	decodePayload:decodePayload
}

var encodingMap = {
	senderAccountId: 'A',
	conversationId: 'C',
	clientUid: 'U',
	toDogoId: 'D',
	body: 'B',
	pictureSecret: 'P',
	pictureWidth: 'W',
	pictureHeight: 'H',
	type:'T',
	truncated:'_'
}

var types = {
	text:1,
	picture:2
}

function encodeMessage(data) {
	var message = data.message
	var payload = {
		aps: {
			badge: 1,
			sound: 'vibrate.wav'
			// alert: gets filled in below
		}
	}
	payload[encodingMap.toDogoId] = data.toDogoId
	payload[encodingMap.senderAccountId] = message.senderAccountId
	payload[encodingMap.conversationId] = message.conversationId
	payload[encodingMap.clientUid] = message.clientUid

	if (message.pictureSecret) {
		payload[encodingMap.pictureSecret] = message.pictureSecret
		payload[encodingMap.pictureWidth] = message.pictureWidth
		payload[encodingMap.pictureHeight] = message.pictureHeight
		payload[encodingMap.type] = types.picture
		payload.aps.alert = data.fromFirstName+' sent you a drawing' // NOTE Clients depend on "\w+ sent you a drawing"
	} else {
		payload.aps.alert = data.fromFirstName+': '+message.body // NOTE Clients depend on \w+: (\w*)
		payload[encodingMap.type] = types.text
		var overflowLength = Buffer.byteLength(JSON.stringify(payload), 'utf8') - 256
		if (overflowLength <= 0) {
			return payload
		} else {
			var truncationLength = '"T":1,'.length
			var removeLength = overflow + truncationLength
			if (removeLength > message.body) {
				log.warn('Could not encode message into 256 character!', message)
				return null
			}
			var newLength = message.body.length - removeLength
			payload.aps.alert = data.fromFirstName+': '+message.body.substr(0, newLength)
			payload[encodingMap.truncated] = 1
			return payload
		}
	}
}

function decodePayload(payload) {
	var data = {
		toDogoId: payload[encodingMap.toDogoId],
		type: payload[encodingMap.type],
		truncated: !!payload[encodingMap.truncated],
		message: {
			senderAccountId: payload[encodingMap.senderAccountId],
			conversationId: payload[encodingMap.conversationId],
			clientUid: payload[encodingMap.clientUid],
			_wasPushed: true
		}
	}

	if (!data.truncated) {
		if (data.type == types.text) {
			var match = payload.aps.alert.match(/^\w+: (.*)/i)
			if (match) {
				data.message.body = match[1]
			} else {
				// should not get here...
				data.truncated = true
			}
		} else if (data.type == types.picture) {
			data.message.pictureSecret = payload[encodingMap.pictureSecret]
			data.message.pictureWidth = payload[encodingMap.pictureWidth]
			data.message.pictureHeight = payload[encodingMap.pictureHeight]
		} else {
			data.truncated = true // should not get here
		}
	}
	
	return data
}
