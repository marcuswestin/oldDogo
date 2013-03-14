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

function _onApnsError() {
	log.error("WARNING apn error", arguments)
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
	// var dogoText = message.payload.body
	// var text = DogoText.getPlainText(dogoText)
	sendSms(phoneNumber, pushFromName+' sent you a '+message.type+' message.', function(err) {
		if (err) { return log.error('Could not send sms', phoneNumber, message) }
		log("message sms sent", phoneNumher)
	})
}

function _sendEmailNotification(emailAddress, pushFromName, message) {
	var convUrl = 'https://dogo.co/c/'+message.conversationId
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
	} else {
		return log.error("Unknown message type", message)
	}
	
	sendEmail(pushFromName + ' - via Dogo <no-reply@dogo.co>', emailAddress, content.subject, content.text, content.html, function(err) {
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
		var pushInfo = pushInfoList[0]
		if (!pushInfo) { return log.info('No push token for', toPersonId, message.messageId) }
		
		if (pushInfo.type != 'ios') { return log.warn('Unknown push type', pushInfo[0]) }
		
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
