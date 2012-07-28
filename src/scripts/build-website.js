var fs = require('fs')
var path = require('path')
var each = require('std/each')
var exec = require('child_process').exec
var buildPage = require('../website/build-page')

var buildDir = 'build/website'

exec('rm -rf '+buildDir+' && mkdir -p '+buildDir, function() {
	var pages = fs.readdirSync('src/website/pages')
	each(pages, function(page) {
		if (!page.match(/\.html$/)) { return }
		var name = page.split('.')[0]
		buildPage(name, { combine:true, minify:true }, function(err, html) {
			if (err) { throw err }
			fs.writeFileSync(buildDir+'/'+page, html)
		})
	})	
})

