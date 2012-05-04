var apns = require('apn'),
	sql = require('./util/sql')

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
			console.log("Created apns connection", devOpts.gateway+':'+devOpts.port)
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
			console.log("Created apns connection", prodOpts.gateway+':'+prodOpts.port)
		}
	}, {
		sendMessage:function(message, toAccountId, prodPush) {
			this.db.selectOne(this, this.sql.selectPushInfo+'WHERE id=?', [toAccountId], function(err, data) {
				if (err) { return }
				if (!data.pushToken) { return console.log('Bah No push token for', toAccountId) }
				if (data.pushSystem != 'ios') { return console.error('WARNING Unknown push system', data.pushSystem) }
				
				var notification = new apns.Notification()
				notification.alert = message.body
				notification.payload = { senderAccountId: message.senderAccountId }
				notification.device = new apns.Device(data.pushToken, ascii=true)
				
				if (prodPush) {
					console.log("Send distribution push notification")
					this.prodApnsConnection.sendNotification(notification)
				} else {
					console.log("Send sandbox push notification")
					this.devApnsConnection.sendNotification(notification)
				}
			})
		},
		
		onApnError:function() {
			console.error("WARNING apn error", arguments)
		},
		
		sql: {
			selectPushInfo: sql.selectFrom('account', {
				pushToken:'push_token',
				pushSystem:'push_system'
			})
		}
	}
)