var fs = require('fs')

module.exports = {
	log:true,
	dev:true,
	port:9000,
	db: {
		host:"localhost",
		password:"dogo",
		database:"dogo",
		user:"dogo_rw"
	},
	s3: {
		bucket:'dogo-dev-conv'
	},
	push: {
		certData:fs.readFileSync(__dirname + '/dev/cert.pem'),
		keyData:fs.readFileSync(__dirname + '/dev/key.pem'),
		passphrase:'dogopass9'
	},
	twilio: {
		disabled: true,
		accountSid: 'AC4132bb5759ca40cfaca106e6f2052a1c',
		authToken: '52d8aefbd1cac7f644f49f0789586a3b',
		from: '+14155992671'
	}
}

