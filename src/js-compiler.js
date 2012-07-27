var fs = require('fs')
var jsServer = require('require/server')
var jsCompiler = require('require/compiler') 

fs.readdirSync(__dirname+'/client').forEach(function(name) {
	var path = __dirname+'/client/'+name,
		stat = fs.statSync(path)
	if (stat.isDirectory()) {
		jsCompiler.addPath(name, path)
		jsServer.addPath(name, path)
	}
})

module.exports = {
	handleRequest:jsServer.handleRequest,
	compile:jsCompiler.compile
}
