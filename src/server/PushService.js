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
		sendMessagePush:function(message, fromAcccountId, toAccountId, prodPush) {
			this.db.selectOne(this, this.sql.selectPushInfo+'WHERE id=?', [toAccountId], function(err, data) {
				if (err) { return }
				if (!data.pushToken) { return console.log('Bah No push token for', toAccountId) }
				if (data.pushSystem != 'ios') { return console.error('WARNING Unknown push system', data.pushSystem) }
				
				this.db.selectOne(this, this.sql.selectAccountFirstName+'WHERE id=?', [fromAcccountId], function(err, fromAccountInfo) {
					if (err) { return console.log("ERROR this.sql.selectAccountFirstName", fromAcccountId) }
					var notification = new apns.Notification()
					notification.payload = { id:message.id, senderAccountId:message.senderAccountId, conversationId:message.conversationId }
					notification.badge = 1
					if (message.payloadId) {
						notification.payload.payloadId = message.payloadId
						notification.payload.payloadType = message.payloadType
						// notification.alert = fromAccountInfo.firstName + ' sent you a drawing'
					} else {
						notification.alert = message.body
						// notification.alert = fromAccountInfo.firstName + ' says: "'+message.body+'"'
					}
					notification.device = new apns.Device(data.pushToken, ascii=true)

					if (prodPush) {
						console.log("Send distribution push notification", JSON.stringify(notification).length)
						this.prodApnsConnection.sendNotification(notification)
					} else {
						console.log("Send sandbox push notification", JSON.stringify(notification).length)
						this.devApnsConnection.sendNotification(notification)
					}
				})
			})
		},
		
		onApnError:function() {
			console.error("WARNING apn error", arguments)
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