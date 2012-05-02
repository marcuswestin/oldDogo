var apns = require('apn'),
	sql = require('./util/sql')

module.exports = proto(null,
	function(database, certData, keyData, keyPassphrase, useSandbox) {
		this.db = database
		var opts = {
			certData:certData,
			keyData:keyData,
			passphrase: keyPassphrase,
			gateway:useSandbox ? 'gateway.sandbox.push.apple.com' : 'gateway.push.apple.com',
			port: 2195,
			// enhanced: true,
		    cacheLength: 5,
			errorCallback: bind(this, this.onApnError)
		}
		this.apnsConnection = new apns.Connection(opts)
		
		console.log("Opened apns connection", opts.gateway+':'+opts.port)
	}, {
		sendMessage:function(message, toAccountId) {
			this.db.selectOne(this, this.sql.selectPushInfo+'WHERE id=?', [toAccountId], function(err, data) {
				if (err) { return }
				if (!data.pushToken) { return console.log('Bah No push token for', toAccountId) }
				if (data.pushSystem != 'ios') { return console.error('WARNING Unknown push system', data.pushSystem) }
				
				var notification = new apns.Notification()
				notification.alert = message.body
				notification.device = new apns.Device(data.pushToken, ascii=true)
				
				this.apnsConnection.sendNotification(notification)
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