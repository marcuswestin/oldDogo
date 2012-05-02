var fs = require('fs')

module.exports = {
	log:true,
	dev:true,
	port:9000,
	dbHost:"localhost",
	dbPassword:"dogo",
	push: {
		cert:fs.readFileSync(__dirname + '/dev/cert.pem'),
		key:fs.readFileSync(__dirname + '/dev/key.pem')
	}
}

