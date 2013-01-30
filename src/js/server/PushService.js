var apns = require('apn')
var log = makeLog('PushService')
var push = require('data/push')
var devConfig = require('server/config/dev/devConfig').push
var prodConfig = require('server/config/prod/prodConfig').push
var db = require('server/Database')

module.exports = {
	sendMessagePush:sendMessagePush
}

var apnsConnections = {
	dev: _connect({
		certData:devConfig.certData,
		keyData:devConfig.keyData,
		passphrase:devConfig.passphrase,
		gateway:'gateway.sandbox.push.apple.com',
		port: 2195,
		// enhanced: true,
		cacheLength: 5,
		errorCallback: _onApnsError
	}),
	prod: _connect({
		certData:prodConfig.certData,
		keyData:prodConfig.keyData,
		passphrase:prodConfig.passphrase,
		gateway:'gateway.push.apple.com',
		port: 2195,
		// enhanced: true,
		cacheLength: 5,
		errorCallback: _onApnsError
	})
}

function _connect(opts) {
	log('Connecting to', opts.gateway+':'+opts.port)
	return new apns.Connection(opts)
}

function _onApnsError() {
	log.error("WARNING apn error", arguments)
}

function sendMessagePush(toPersonId, pushFromName, message, prodPush) {
	db.people(toPersonId).selectOne('SELECT pushJson FROM person WHERE personId=?', [toPersonId], function(err, res) {
		if (err) { return }
		var pushInfoList = JSON.parse(res.pushJson)
		var pushInfo = pushInfoList[0]
		if (!pushInfo) { return log('Bah! No push token for', toPersonId, message.messageId) }
		
		if (pushInfo.type != 'ios') { return log('Unknown push type', pushInfo[0]) }
		
		var notification = new apns.Notification()
		notification.device = new apns.Device(pushInfo[0].token)
		notification.payload = push.encodeMessage({
			message:message,
			toPersonId:toPersonId,
			fromFirstName:pushFromName
		})
		
		log("Send push notification to person Id", toPersonId)
		var connection = prodPush ? prodApnsConnection : devApnsConnection
		connection.sendNotification(notification)
	})
}
