var fs = require('fs')

module.exports = {
	prod:prod,
	dev:dev
}

function prod() {
	var devSecrets = dev()
	var dir = __dirname + '/../../../../secrets/prod/'
	var secrets = require(dir+'prodSecrets.json')
	secrets.push.apple.production.certData = fs.readFileSync(dir + '/push/apple/production/cert.pem')
	secrets.push.apple.production.keyData = fs.readFileSync(dir + '/push/apple/production/key.pem')
	secrets.push.apple.sandbox = devSecrets.push.apple.sandbox // prod needs both production and sandbox
	return secrets
}

function dev() {
	var dir = __dirname + '/../../../../secrets/dev/'
	var secrets = require(dir+'devSecrets.json')
	secrets.push.apple.sandbox.certData = fs.readFileSync(dir + '/push/apple/sandbox/cert.pem')
	secrets.push.apple.sandbox.keyData = fs.readFileSync(dir + '/push/apple/sandbox/key.pem')
	return secrets
}