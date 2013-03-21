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

function sendMessagePush(people, dogoRecipients, externalRecipients, pushFromName, message, prodPush, callback) {
	parallel(_notifyDogoRecipients, _notifyExternalRecipients, callback)

	function _notifyDogoRecipients(callback) {
		asyncEach(dogoRecipients, {
			parallel:true,
			finish:callback,
			iterate:function(personId, callback) {
				_sendPushNotification(personId, pushFromName, message, prodPush, callback)
			}
		})
	}

	function _notifyExternalRecipients(callback) {
		if (!externalRecipients.length) { return callback() }
		log('send external message notifications', externalRecipients, message)
		asyncEach(externalRecipients, {
			parallel:true,
			finish:function() { log('done sending external message notifications') },
			iterate:function(addrInfo, callback) {
				var sql = 'SELECT secret FROM guestAccess WHERE conversationId=? AND personIndex=?'
				db.conversation(message.conversationId).selectOne(sql, [message.conversationId, addrInfo.personIndex], function(err, guestAccess) {
					if (err) { return callback(err) }
					var secret = guestAccess.secret
					var toAddress = people[addrInfo.personIndex]
					if (Addresses.isEmail(toAddress)) {
						_sendEmailNotification(toAddress.addressId, addrInfo.personIndex, secret, pushFromName, message, callback)
					} else if (Addresses.isPhone(toAddress)) {
						_sendPhoneNotification(toAddress.addressId, addrInfo.personIndex, secret, pushFromName, message, callback)
					} else if (Addresses.isFacebook(toAddress)) {
						log.warn("TODO Fix send to facebook")
						return callback("Cant push to facebook yet")
					}
				})
			}
		})
	}
}

var phoneWhitelist = arrayToObject(['+14124238669','+14156015654','+16319651971'])
function _sendPhoneNotification(phoneNumber, personIndex, secret, pushFromName, message, callback) {
	if (!phoneWhitelist[phoneNumber]) {
		log.warn("Ignoring non-whitelist address", phoneNumber)
		return callback()
	}
	var url = ' '+_conversationUrl(message, personIndex, secret)
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
	sendSms(phoneNumber, smsText, callback)
}

function _conversationUrl(message, personIndex, secret) {
	return [gConfig.serverUrl, 'c', message.conversationId, personIndex, secret].join('/')
}


var emailWhitelist = arrayToObject(['narcvs@gmail.com','marcus.westin@gmail.com','ashleynkbaker@gmail.com'])
function _sendEmailNotification(emailAddress, personIndex, secret, pushFromName, message, callback) {
	if (!emailWhitelist[emailAddress]) {
		log.warn("Ignoring non-whitelist address", emailAddress)
		return callback()
	}
	var convUrl = _conversationUrl(message, personIndex, secret)
	var content = null
	
	if (Messages.isText(message)) {
		var dogoText = message.payload.body
		var plainText = DogoText.getPlainText(dogoText)
		content = {
			subject: plainText.length > 40 ? plainText.substr(0, 40) + '...' : plainText,
			text:plainText + '\n' + convUrl,
			html:DogoText.getHtml(dogoText) + '<br><a href="'+convUrl+'">' + convUrl + '</a>'
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

function _sendPushNotification(toPersonId, pushFromName, message, prodPush, callback) {
	log.info('send message push', toPersonId, pushFromName, message, prodPush)
	if (disabled) { log.debug('(disabled - skipping message push)'); return }
	if (!toPersonId) { return log.error('No person id', arguments) }
	db.person(toPersonId).selectOne('SELECT pushJson FROM person WHERE personId=?', [toPersonId], function(err, res) {
		if (err) { return callback(err) }
		var pushInfoList = jsonList(res.pushJson)
		var pushInfo = last(pushInfoList)
		if (!pushInfo) { return log.info('No push token for', toPersonId, message.messageId) }
		
		if (pushInfo.type != 'ios') {
			log.error('unknown push type', pushInfo)
			return callback('Unknown push type: ' + pushInfo.type)
		}
		
		var payload = Messages.encodeForPush(message, pushFromName)
		if (!payload) {
			log.error('could not encode payload', message, toPersonId, pushFromName)
			return callback("Could not encode payload")
		}
		
		var notification = new apns.Notification()
		notification.device = new apns.Device(pushInfo.token)
		notification.payload = payload
		
		log.debug('do send', pushInfo, toPersonId)
		var connection = prodPush ? apnsConnections.prod : apnsConnections.sandbox
		connection.sendNotification(notification)
		
		callback() // we don't get notified of success
	})
}
