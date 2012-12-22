var apns = require('apn')
var sql = require('./util/sql')
var log = makeLog('PushService')

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
					notification.payload = {
						id:message.id,
						senderAccountId:message.senderAccountId,
						conversationId:message.conversationId,
						toDogoId:toAccountId,
						clientUid:message.clientUid
					}
					notification.badge = 1
					notification.sound = "vibrate.wav"
					if (message.pictureId) {
						notification.payload.pictureId = message.pictureId
						notification.payload.pictureSecret = message.pictureSecret
						notification.payload.pictureWidth = message.pictureWidth
						notification.payload.pictureHeight = message.pictureHeight
						notification.alert = fromAccountInfo.firstName + ' sent you a drawing' // NOTE Clients depend on "\w+ sent you a drawing"
					} else {
						notification.alert = fromAccountInfo.firstName + ' says: "'+message.body+'"'
					}
					notification.device = new apns.Device(data.pushToken, ascii=true)

					if (prodPush) {
						log("Send distribution push notification", JSON.stringify(notification).length)
						this.prodApnsConnection.sendNotification(notification)
					} else {
						log("Send sandbox push notification", JSON.stringify(notification).length)
						this.devApnsConnection.sendNotification(notification)
					}
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