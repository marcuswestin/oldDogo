var fs = require('fs')
var jsServer = require('require/server')
var jsCompiler = require('require/compiler') 
var stylus = require('stylus')
var nib = require('nib')
var options = require('std/options')

module.exports = {
	handleRequireRequest:jsServer.handleRequest,
	compileJs:jsCompiler.compile,
	compileStylusPath:compileStylusPath
}

fs.readdirSync(__dirname+'/client').forEach(function(name) {
	var path = __dirname+'/client/'+name,
		stat = fs.statSync(path)
	if (stat.isDirectory()) {
		jsCompiler.addPath(name, path)
		jsServer.addPath(name, path)
	}
})

function compileStylusPath(stylusPath, opts, callback) {
	if (!callback) { callback = opts }
	opts = options(opts, {
		minify:false
	})
	
	var filename = __dirname + stylusPath.replace('/stylus/src', '')
	if (!filename.match(/\.styl$/)) { filename += '.styl' }
	fs.readFile(filename, function(err, content) {
		if (err) { return callback(err) }
		stylus(content.toString())
			.set('filename', filename)
			.set('compress', opts.minify)
			.use(nib())
			.import('nib')
			.render(callback)
	})
}
