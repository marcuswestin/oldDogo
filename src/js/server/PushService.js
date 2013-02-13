var apns = require('apn')
var log = makeLog('PushService')
var push = require('data/push')

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

function sendMessagePush(toPersonId, pushFromName, message, prodPush) {
	log.info('send message push', toPersonId, pushFromName, message, prodPush)
	if (disabled) { log.debug('(disabled - skipping message push)'); return }
	db.people(toPersonId).selectOne('SELECT pushJson FROM person WHERE personId=?', [toPersonId], function(err, res) {
		if (err) {
			log.error(err)
			return
		}
		var pushInfoList = jsonList(res.pushJson)
		var pushInfo = pushInfoList[0]
		if (!pushInfo) { return log.info('No push token for', toPersonId, message.messageId) }
		
		if (pushInfo.type != 'ios') { return log.warn('Unknown push type', pushInfo[0]) }
		
		var notification = new apns.Notification()
		notification.device = new apns.Device(pushInfo.token)
		notification.payload = push.encodeMessage({
			message:message,
			toPersonId:toPersonId,
			fromFirstName:pushFromName
		})
		
		log.debug('do send', toPersonId)
		var connection = prodPush ? apnsConnections.prod : apnsConnections.sandbox
		connection.sendNotification(notification)
	})
}
