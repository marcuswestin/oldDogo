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
	}
}

