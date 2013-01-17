var apns = require('apn')
var sql = require('./util/sql')
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
		sendMessagePush:function(message, fromAccountId, toAccountId, prodPush) {
			this.db.selectOne(this, this.sql.selectPushInfo+'WHERE id=?', [toAccountId], function(err, data) {
				if (err) { return }
				if (!data.pushToken) { return log('Bah No push token for', toAccountId) }
				if (data.pushSystem != 'ios') { return log.error('WARNING Unknown push system', data.pushSystem) }
				
				this.db.selectOne(this, this.sql.selectAccountFirstName+'WHERE id=?', [fromAccountId], function(err, fromAccountInfo) {
					if (err) { return log.error("ERROR this.sql.selectAccountFirstName", fromAccountId) }
					
					var notification = new apns.Notification()
					notification.device = new apns.Device(data.pushToken, ascii=true)
					notification.payload = push.encodeMessage({
						message:message,
						recipientDogoId:toAccountId,
						fromFirstName:fromAccountInfo.firstName
					})
					
					log("Send push notification to account ID", toAccountId)
					var connection = prodPush ? this.prodApnsConnection : this.devApnsConnection
					connection.sendNotification(notification)
				})
			})
		},
		
		onApnError:function() {
			log.error("WARNING apn error", arguments)
		},
		
		sql: {
			selectPushInfo: sql.selectFrom('account', {
				pushToken:'push_token',
				pushSystem:'push_system'
			}),
			selectAccountFirstName: sql.selectFrom('account', {
				firstName:'first_name'
			})
		}
	}
)