var Messages = require('data/Messages')

module.exports = {
	encodeMessage:encodeMessage,
	decode:decodePush
}

var encodingMap = {
	senderPersonId: 'D',
	conversationId: 'C',
	clientUid: 'U',
	recipientPersonId: 'R',
	payload: 'P',
	sentTime: 'S',
	type:'T',
	truncated:'_'
}

function encodeMessage(data) {
	var message = data.message
	var push = {
		aps: {
			badge: 1,
			sound: 'vibrate.wav'
			// alert: gets filled in below
		}
	}
	push[encodingMap.recipientPersonId] = data.recipientPersonId
	push[encodingMap.senderPersonId] = message.senderPersonId
	push[encodingMap.conversationId] = message.conversationId
	push[encodingMap.clientUid] = message.clientUid
	push[encodingMap.sentTime] = message.sentTime
	push[encodingMap.type] = Messages.types[message.type]

	if (message.type == 'picture') {
		push[encodingMap.payload] = Messages.payload[message.type].encode(message.payload)
		push.aps.alert = data.fromFirstName+' sent you a drawing' // NOTE Clients depend on "\w+ sent you a drawing"
	} else if (message.type == 'text') {
		var body = message.payload.body
		push.aps.alert = data.fromFirstName+': '+body // NOTE Clients depend on \w+: (\w*)
		var overflowLength = Buffer.byteLength(JSON.stringify(push), 'utf8') - 256
		if (overflowLength > 0) {
			var truncationLength = '"_":1,'.length
			var removeLength = overflowLength + truncationLength
			if (removeLength > body) {
				log.warn('Could not encode message into 256 character!', message)
				return null
			}
			var newBodyLength = body.length - removeLength
			push.aps.alert = data.fromFirstName+': '+body.substr(0, newBodyLength)
			push[encodingMap.truncated] = 1
		}
	} else {
		return null
	}
	return push
}

function decodePush(push) {
	var data = {
		recipientPersonId: push[encodingMap.recipientPersonId],
		truncated: !!push[encodingMap.truncated],
		message: {
			type: Messages.types.reverse[push[encodingMap.type]],
			senderPersonId: push[encodingMap.senderPersonId],
			conversationId: push[encodingMap.conversationId],
			clientUid: push[encodingMap.clientUid],
			sentTime: push[encodingMap.sentTime],
			_wasPushed: true
		}
	}

	if (!data.truncated) {
		if (data.message.type == 'text') {
			var match = push.aps.alert.match(/^\w+: (.*)/i)
			if (match) {
				data.message.payload = { body:match[1] }
			} else {
				// should not get here...
				data.truncated = true
			}
		} else if (data.message.type == 'picture') {
			data.message.payload = Messages.payload['picture'].decode(push[encodingMap.payload])
		} else {
			data.truncated = true // should not get here
		}
	}
	
	return data
}
