var makeEncoder = require('./makeEncoder')
var inverse = require('std/inverse')

var Messages = module.exports = {
	types:getTypes(),
	cleanPayloadForUpload:cleanPayloadForUpload,
	encodeForPush:encodeForPush,
	decodeFromPush:decodeFromPush,
	isAudio:isAudio,
	isText:isText,
	isPicture:isPicture
}

function isAudio(message) { return message.type == Messages.types.audio }
function isText(message) { return message.type == Messages.types.text }
function isPicture(message) { return message.type == Messages.types.picture }

function getTypes() {
	var types = { 'text':1, 'picture':2, 'audio':3 }
	types.inverse = inverse(types)
	return types
}

function getTypeName(type) { return Messages.types.inverse[type] }

function cleanPayloadForUpload(type, payload) {
	if (type == Messages.types.picture) {
		if (!payload.width || !payload.height) { return null }
		return { secret:payload.secret, width:payload.width, height:payload.height }
	} else if (type == Messages.types.text) {
		if (!payload.body) { return null }
		return { body:payload.body }
	} else if (type == Messages.types.audio) {
		if (!payload.duration) { return null }
		return { duration:payload.duration }
	}
	return null
}

var messagePushEncoder = makeEncoder({
	fromPersonId: 'D',
	conversationId: 'C',
	clientUid: 'U',
	sentTime: 'S',
	type:'T',
	payload: 'p'
})

var payloadEncoders = {
	text: makeEncoder({
		'body':'b'
	}),
	picture: makeEncoder({
		'secret':'s',
		'width':'w',
		'height':'h'
	}),
	audio: makeEncoder({
		'secret':'s',
		'duration':'d'
	})
}

var overflowPostfix = '…'
function encodeForPush(message, fromFirstName) {
	var push = messagePushEncoder.encode(message)
	
	push.aps = {
		badge: 1,
		sound: 'vibrate.wav'
		// alert: gets filled in below
	}

	if (Messages.isPicture(message)) {
		push.aps.alert = fromFirstName+' sent you a drawing'
		messagePushEncoder.addTo(push, {
			'payload':payloadEncoders.picture.encode(message.payload)
		})
	
	} else if (Messages.isAudio(message)) {
		push.aps.alert = fromFirstName+' sent you a voice message'
		messagePushEncoder.addTo(push, {
			'payload':payloadEncoders.audio.encode(message.payload)
		})
	
	} else if (Messages.isText(message)) {
		var dogoText = message.payload.body
		var plainText = DogoText.getPlainText(dogoText)

		// Attempt 1
		push.aps.alert = fromFirstName+': '+plainText
		messagePushEncoder.addTo(push, {
			'payload':payloadEncoders.text.encode(message.payload)
		})
		
		var overflow = numBytes(JSON.stringify(push)) - 256
		if (overflow <= 0) { return push }

		var plainTextLength = numBytes(plainText, 'utf8')
		var postfixLength = numBytes(overflowPostfix)
		if (overflow < plainTextLength - postfixLength) {
			push.aps.alert = fromFirstName+': '+plainText.substr(0, overflow-postfixLength)+overflowPostfix
			return push
		}
		
		messagePushEncoder.removeFrom(push, 'payload')
		var overflow = numBytes(JSON.stringify(push)) - 256
		if (overflow < plainTextLength - postfixLength) {
			push.aps.alert = fromFirstName+': '+plainText.substr(0, overflow-postfixLength)+overflowPostfix
			return push
		}
		
		log.error('Could not push encode message', message)
		return null
	}
	
	return push
}

function numBytes(str) { return Buffer.byteLength(str, 'utf8') }

function decodeFromPush(push) {
	var message = messagePushEncoder.decode(push)
	if (!message) { return null }
	
	// Check if message was truncated to fit into push
	if (message.payload) {
		var payloadEncoder = payloadEncoders[getTypeName(message.type)]
		message.payload = payloadEncoder.decode(message.payload)
	}
	
	return message
}
