var fs = require('fs')
var shardConfig = require('server/config/shardConfig')
var shardAccess = {
	host:"localhost",
	password:"dogopass9",
	user:"dogoApp"
}

module.exports = {
	log:true,
	dev:true,
	port:9000,
	aws: {
		accessKeyId:'AKIAJDUJ4DPW4DE7552Q',
		accessKeySecret:'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',
		s3: {
			bucket:'dogo-dev',
			region:'us-east-1'
		}
	},
	push: {
		certData:fs.readFileSync(__dirname + '/cert.pem'),
		keyData:fs.readFileSync(__dirname + '/key.pem'),
		passphrase:'dogopass3'
	},
	twilio: {
		disabled: true,
		accountSid: 'AC4132bb5759ca40cfaca106e6f2052a1c',
		authToken: '52d8aefbd1cac7f644f49f0789586a3b',
		from: '+14155992671'
	},
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
	}
}
