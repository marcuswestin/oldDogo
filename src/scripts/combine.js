var fs = require('fs')
var jsServer = require('require/server')
var jsCompiler = require('require/compiler') 
var stylus = require('stylus')
var nib = require('nib')
var options = require('std/options')

module.exports = {
	handleRequireRequest:jsServer.handleRequest,
	compileJs:jsCompiler.compile,
	compileStylusPath:compileStylusPath,
	compileStylus:compileStylus
}

function compileStylusPath(stylusPath, opts, callback) {
	var filename = __dirname + '/../' + stylusPath.replace('/stylus', '')
	if (!filename.match(/\.styl$/)) { filename += '.styl' }
	opts.filename = filename
	fs.readFile(filename, function(err, content) {
		if (err) { return callback(err) }
		compileStylus(content, opts, callback)
	})
}

function compileStylus(content, opts, callback) {
	opts = options(opts, {
		minify:false,
		filename:null
	})
	stylus(content.toString())
		.set('filename', opts.filename)
		.set('compress', opts.minify)
		.use(nib())
		.import('nib')
		.render(callback)
}