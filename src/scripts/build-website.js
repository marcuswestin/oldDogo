var fs = require('fs')
var path = require('path')
var each = require('std/each')
var map = require('std/map')
var exec = require('child_process').exec
var buildPage = require('../website/build-page')

var dstDir = 'build/website'
var buildDir = '/tmp/dogo-build-website'
var minify = true

console.log("Compiling static website pages...")

var copyCommands = map(['img','fonts','lib'], function(dir) {
	return 'cp -r src/'+dir+' '+buildDir
}).join(' && ')

exec('rm -rf '+buildDir+' && mkdir -p '+buildDir+'/pages && '+copyCommands, function() {
	var pages = fs.readdirSync('src/website/pages')
	;(function next() {
		if (!pages.length) {
			return exec('mkdir -p '+dstDir+' && rm -rf '+dstDir+' && mv '+buildDir+' '+dstDir, function(err) {
				if (err) { throw err }
				console.log("Done!")
			})
		}
		var page = pages.pop()
		if (!page.match(/\.(html|md)$/)) { return next() }
		var name = page.split('.')[0]
		console.log("Build page:", name)
		buildPage(name, { combine:true, minify:minify }, function(err, html) {
			if (err) { throw err }
			html = html.replace(/\/blowtorch\/fonts\//g, '/fonts/')
			fs.writeFileSync(buildDir+'/pages/'+name+'.html', html)
			next()
		})
	})()
})
