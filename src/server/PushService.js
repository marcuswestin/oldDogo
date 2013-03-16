var apns = require('apn')
var log = makeLog('PushService')
var sendEmail = require('server/fn/sendEmail')
var sendSms = require('server/fn/sendSms')

module.exports = {
	sendMessagePush:sendMessagePush,
	configure:configure,
	disable:disable
}

var apnsConnections = {}
function configure(pushConf) {
	if (pushConf.disable) { return disable() }
	apnsConnections.sandbox = _connect({
		certData:pushConf.apple.sandbox.certData,
		keyData:pushConf.apple.sandbox.keyData,
		passphrase:pushConf.apple.sandbox.passphrase,
		gateway:'gateway.sandbox.push.apple.com',
		port: 2195,
		// enhanced: true,
		cacheLength: 5,
		errorCallback: _onApnsError
	})
	
	if (pushConf.apple.production) {
		apnsConnections.production = _connect({
			certData:pushConf.apple.production.certData,
			keyData:pushConf.apple.production.keyData,
			passphrase:pushConf.apple.production.passphrase,
			gateway:'gateway.push.apple.com',
			port: 2195,
			// enhanced: true,
			cacheLength: 5,
			errorCallback: _onApnsError
		})
	}
}

var disabled = false
function disable() { disabled = true }

function _connect(opts) {
	log('Connecting to', opts.gateway+':'+opts.port)
	return new apns.Connection(opts)
}

var errorNames = {
	1: 'Processing error',
	2: 'Missing device token',
	3: 'Missing topic',
	4: 'Missing payload',
	5: 'Invalid token size',
	6: 'Invalid topic size',
	7: 'Invalid payload size',
	8: 'Invalid token'
}
function _onApnsError(errorCode, push) {
	log.error("WARNING apn error", { error:{ code:errorCode, name:errorNames[errorCode] }, push:push })
}

function sendMessagePush(address, pushFromName, message, prodPush) {
	if (Addresses.isDogo(address)) {
		_sendPushNotification(address.addressId, pushFromName, message, prodPush)
	} else if (Addresses.isEmail(address)) {
		_sendEmailNotification(address.addressId, pushFromName, message)
	} else if (Addresses.isPhone(address)) {
		_sendPhoneNotification(address.addressId, pushFromName, message)
	} else if (Addresses.isFacebook(address)) {
		log.warn("TODO Fix send to facebook")
	}
}

function _sendPhoneNotification(phoneNumber, pushFromName, message) {
	var url = ' '+_conversationUrl(message)
	var maxLength = 160 - (gConfig.dev ? 'Sent from the Twilio Sandbox Number - '.length : 0)
	var remaining = maxLength - pushFromName.length - url.length
	if (remaining < 2) {  }
	
	var minBody = ' sent'
	if (remaining < minBody.length) { return log.error('Could not construct sms', phoneNumber, pushFromName, message) }
	
	var body = null
	if (Messages.isAudio(message)) {
		body = ' sent you a voice message:'
	} else if (Messages.isPicture(message)) {
		body = ' sent you a picture:'
	} else if (Messages.isText(message)) {
		var plainText = DogoText.getPlainText(message.payload.body)
		body = ': "'+plainText+'"'
		var overflow = body.length - remaining
		if (overflow > 0) {
			var ellipsis = ' ...'
			body = ': "'+plainText.substr(0, plainText.length - overflow - ellipsis.length)+ellipsis+'"'
		}
	}
	
	if (body.length > remaining) { body = minBody }
	
	var smsText = pushFromName+body+url
	
	log.info("sending sms", phoneNumber, smsText)
	sendSms(phoneNumber, smsText, function(err) {
		if (err) { return log.error('Could not send sms', phoneNumber, message) }
	})
}

function _conversationUrl(message) { return gConfig.serverUrl+'/c/'+message.conversationId }

function _sendEmailNotification(emailAddress, pushFromName, message) {
	var convUrl = _conversationUrl(message)
	var content = null
	
	if (Messages.isText(message)) {
		var dogoText = message.payload.body
		var plainText = DogoText.getPlainText(dogoText)
		content = {
			subject: plainText.length > 40 ? plainText.substr(0, 40) + '...' : plainText,
			text:plainText,
			html:DogoText.getHtml(dogoText)
		}
	} else if (Messages.isPicture(message)) {
		content = {
			subject:'A picture.',
			text:pushFromName+' sent you a picture with Dogo: '+convUrl,
			html:pushFromName+' sent you a picture with Dogo: <a href="'+convUrl+'">'+convUrl+'</a><br><br><a href="'+convUrl+'"><img src="'+Payloads.url(message)+'"></a>'
		}
	} else if (Messages.isAudio(message)) {
		content = {
			subject:'A voice message.',
			text:pushFromName+' sent you a voice message with Dogo: '+convUrl,
			html:pushFromName+' sent you a voice message with Dogo: <a href="'+convUrl+'">'+convUrl+'</a><br><br><audio src="'+Payloads.url(message)+'" controls="true">'
		}
	} else {
		return log.error("Unknown message type", message)
	}
	
	sendEmail('From '+pushFromName + ' via Dogo <no-reply@dogo.co>', emailAddress, content.subject, content.text, content.html, function(err) {
		if (err) { return log.error('Could not send email', emailAddress, message) }
		log('message email sent', emailAddress)
	})
}

function _sendPushNotification(toPersonId, pushFromName, message, prodPush) {
	log.info('send message push', toPersonId, pushFromName, message, prodPush)
	if (disabled) { log.debug('(disabled - skipping message push)'); return }
	if (!toPersonId) { return log.error('No person id', arguments) }
	db.people(toPersonId).selectOne('SELECT pushJson FROM person WHERE personId=?', [toPersonId], function(err, res) {
		if (err) {
			log.error(err)
			return
		}
		var pushInfoList = jsonList(res.pushJson)
		var pushInfo = last(pushInfoList)
		if (!pushInfo) { return log.info('No push token for', toPersonId, message.messageId) }
		
		if (pushInfo.type != 'ios') { return log.warn('Unknown push type', pushInfo) }
		
		var payload = Messages.encodeForPush(message, pushFromName)
		if (!payload) { return log.error("Could not encode payload", message, toPersonId, pushFromName) }
		
		var notification = new apns.Notification()
		notification.device = new apns.Device(pushInfo.token)
		notification.payload = payload
		
		log.debug('do send', toPersonId)
		var connection = prodPush ? apnsConnections.prod : apnsConnections.sandbox
		connection.sendNotification(notification)
	})
}
