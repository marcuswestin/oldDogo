var fs = require('fs')
var path = require('path')
var each = require('std/each')
var exec = require('child_process').exec
var buildPage = require('../website/build-page')

var dstDir = 'build/website'
var buildDir = '/tmp/dogo-build-website'

exec('rm -rf '+buildDir+' && mkdir -p '+buildDir+' && cp -r src/website/static '+buildDir, function() {
	var pages = fs.readdirSync('src/website/pages')
	;(function next() {
		if (!pages.length) {
			return exec('mkdir -p '+dstDir+' && rm -rf '+dstDir+' && mv '+buildDir+' '+dstDir, function(err) {
				if (err) { throw err }
				console.log("DONE!")
			})
		}
		var page = pages.pop()
		if (!page.match(/\.html$/)) { return next() }
		var name = page.split('.')[0]
		buildPage(name, { combine:true, minify:true }, function(err, html) {
			if (err) { throw err }
			fs.writeFileSync(buildDir+'/pages/'+page, html)
			next()
		})
	})()
})
