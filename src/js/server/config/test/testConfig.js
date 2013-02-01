var fs = require('fs')

module.exports = {
	log:true,
	dev:true,
	port:9090,
	db: {
		host:"localhost",
		password:"test",
		database:"dogo_test",
		user:"dogo_tester"
	},
	s3: {
		bucket:'dogo-test',
		accessKeyId:'AKIAJDUJ4DPW4DE7552Q',
		accessKeySecret:'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'
	},
	push: {
		certData: null,
		keyData:null,
		passphrase:null
	},
	twilio: {
		disabled: true,
		accountSid: 'AC4132bb5759ca40cfaca106e6f2052a1c',
		authToken: '52d8aefbd1cac7f644f49f0789586a3b',
		from: '+14155992671'
	}
}

