var apns = require('apn')
var log = makeLog('PushService')
var push = require('data/push')

module.exports = proto(null,
	function(database, dev, prod) {
		this.db = database
		
		if (dev) {
			var devOpts = {
				certData:dev.certData,
				keyData:dev.keyData,
				passphrase:dev.passphrase,
				gateway:'gateway.sandbox.push.apple.com',
				port: 2195,
				// enhanced: true,
			    cacheLength: 5,
				errorCallback: bind(this, this.onApnError)
			}
			this.devApnsConnection = new apns.Connection(devOpts)
			log("Created apns connection", devOpts.gateway+':'+devOpts.port)
		}
		
		if (prod) {
			var prodOpts = {
				certData:prod.certData,
				keyData:prod.keyData,
				passphrase:prod.passphrase,
				gateway:'gateway.push.apple.com',
				port: 2195,
				// enhanced: true,
			    cacheLength: 5,
				errorCallback: bind(this, this.onApnError)
			}
			
			this.prodApnsConnection = new apns.Connection(prodOpts)
			log("Created apns connection", prodOpts.gateway+':'+prodOpts.port)
		}
	}, {
		sendMessagePush:function(message, fromPersonId, toPersonId, prodPush) {
			this.db.selectOne(this, sql.selectPushInfo+'WHERE id=?', [toPersonId], function(err, data) {
				if (err) { return }
				if (!data.pushToken) { return log('Bah No push token for', toPersonId) }
				if (data.pushSystem != 'ios') { return log.error('WARNING Unknown push system', data.pushSystem) }
				
				this.db.selectOne(this, sql.selectPersonFirstName+'WHERE id=?', [fromPersonId], function(err, fromPersonInfo) {
					if (err) { return log.error("ERROR sql.selectPersonFirstName", fromPersonId) }
					
					var notification = new apns.Notification()
					notification.device = new apns.Device(data.pushToken, ascii=true)
					notification.payload = push.encodeMessage({
						message:message,
						recipientPersonId:toPersonId,
						fromFirstName:fromPersonInfo.firstName || fromPersonInfo.name.split(' ')[0]
					})
					
					log("Send push notification to person Id", toPersonId)
					var connection = prodPush ? this.prodApnsConnection : this.devApnsConnection
					connection.sendNotification(notification)
				})
			})
		},
		
		onApnError:function() {
			log.error("WARNING apn error", arguments)
		}
	}
)

var sql = {
	selectPushInfo:'SELECT pushToken, pushSystem FROM person ',
	selectPersonFirstName:'SELECT firstName FROM person '
}
