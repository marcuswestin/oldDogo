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
		bucket:'dogo-test-conv',
		accessKeyId:'AKIAJDUJ4DPW4DE7552Q',
		secretAccessKey:'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'
	},
	push: {
		certData: null, // fs.readFileSync(__dirname + '/dev/cert.pem'),
		keyData:null, // fs.readFileSync(__dirname + '/dev/key.pem'),
		passphrase:null //'dogopass9'
	},
	twilio: {
		disabled: true,
		accountSid: 'AC4132bb5759ca40cfaca106e6f2052a1c',
		authToken: '52d8aefbd1cac7f644f49f0789586a3b',
		from: '+14155992671'
	}
}

