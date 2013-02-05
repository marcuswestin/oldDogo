var fs = require('fs')
var shardConfig = require('server/config/shardConfig')
var shardAccess = {
	host:"localhost",
	password:"test",
	user:"dogo_tester"
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
		certData:null,
		keyData:null,
		passphrase:null
	},
	twilio: {
		disabled: true,
		accountSid: null,
		authToken: null,
		from: null
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
	},
	facebook: {
		appId: '219049001532833',
		appSecret: '8916710dbc540f3d439f4f6a67a3b5e7',
		appAccessToken: '219049001532833|OyfUJ1FBjvZ3lVNjOMM3SFqm6CE'
	}
}
