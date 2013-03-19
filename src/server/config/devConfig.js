var fs = require('fs')
var shardConfig = require('./shardConfig')
var secrets = require('./secrets').dev()
var shardAccess = {
	host:"localhost",
	password:"dogopass9",
	user:"dogoApp"
}

var myIp
each(require('os').networkInterfaces(), function(ifaces, name) {
	each(ifaces, function(iface) {
		if (iface.family != 'IPv4') { return }
		if (iface.address == '127.0.0.1') { return }
		myIp = iface.address
	})
})
if (!myIp) { myIp = equire('os').hostname() } // fallback

module.exports = {
	log:true,
	dev:true,
	port:9000,
	protocol:'http:',
	serverUrl:'http://'+myIp+':9000',
	aws: {
		accessKeyId:secrets.aws.accessKeyId,
		accessKeySecret:secrets.aws.accessKeySecret,
		ses: {},
		s3: {
			bucket:'dogo-co-dev',
			region:'us-east-1'
		}
	},
	push: secrets.push,
	dbShards: {
		people: [
			shardConfig.shard('People', 1, shardAccess)
			,shardConfig.shard('People', 2, shardAccess)
			,shardConfig.shard('People', 3, shardAccess)
			,shardConfig.shard('People', 4, shardAccess)
		],
		conversations: [
			shardConfig.shard('Conversations', 1, shardAccess)
			,shardConfig.shard('Conversations', 2, shardAccess)
			,shardConfig.shard('Conversations', 3, shardAccess)
			,shardConfig.shard('Conversations', 4, shardAccess)
		],
		lookup: [
			shardConfig.lookupShard(shardAccess)
		]
	},
	facebook: secrets.facebook,
	twilio: {
		disableAlerts:true,
		accountSid: secrets.twilio.accountSid,
		authToken: secrets.twilio.authToken,
		from: '+14155992671'
	}
}
