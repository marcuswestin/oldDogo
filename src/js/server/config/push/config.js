var fs = require('fs')

module.exports = {
	apple: {
		sandbox: {
			certData:fs.readFileSync(__dirname + '/apple/sandbox/cert.pem'),
			keyData:fs.readFileSync(__dirname + '/apple/sandbox/key.pem'),
			passphrase:'dogopass3'
		},
		prod: {
			certData:fs.readFileSync(__dirname + '/apple/prod/cert.pem'),
			keyData:fs.readFileSync(__dirname + '/apple/prod/key.pem'),
			passphrase:'dogopass3'
		}
	}
}