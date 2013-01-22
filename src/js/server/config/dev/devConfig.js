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
	shards: {
		dogo1: shardConfig.dogoShard(1, shardAccess),
		dogo2: shardConfig.dogoShard(2, shardAccess),
		dogo3: shardConfig.dogoShard(3, shardAccess),
		dogo4: shardConfig.dogoShard(4, shardAccess),
		dogoLookup: shardConfig.lookupShard(shardAccess)
	},
	s3: {
		bucket:'dogo-dev',
		accessKeyId:'AKIAJDUJ4DPW4DE7552Q',
		secretAccessKey:'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'
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
	}
}

