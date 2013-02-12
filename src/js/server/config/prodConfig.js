var fs = require('fs')
var shardConfig = require('server/config/shardConfig')
var secrets = require('./secrets').prod()
var shardAccess = {
	host:secrets.db.host,
	password:secrets.db.password,
	user:secrets.db.user
}

module.exports = {
	log:true,
	dev:false,
	port:9000,
	serverUrl:'https://dogo.co',
	aws: {
		accessKeyId:secrets.aws.accessKeyId,
		accessKeySecret:secrets.aws.accessKeySecret,
		ses: {},
		s3: {
			bucket:'dogo-co',
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
		accountSid: secrets.twilio.accountSid,
		authToken: secrets.twilio.authToken,
		from: '+14155992671'
	}
}
