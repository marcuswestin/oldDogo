var fs = require('fs')

module.exports = {
	log:true,
	dev:true,
	port:9000,
	dbHost:"localhost",
	dbPassword:"dogo",
	push: {
		certData:fs.readFileSync(__dirname + '/dev/cert.pem'),
		keyData:fs.readFileSync(__dirname + '/dev/key.pem'),
		passphrase:'dogopass9'
	}
}

