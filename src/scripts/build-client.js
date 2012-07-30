var fs = require('fs'),
	exec = require('child_process').exec,
	combine = require('../combine'),
	path = require('path')

var dir = '/build/dogo-ios-build'

exec('rm -rf '+dir, function() {
	exec('mkdir -p '+dir, function() {
		var styl = 'src/client/style/dogo.styl'
		fs.readFile(styl, { filename:styl }, function(err, content) {
			if (err) { return console.log(err) }
			combine.compileStylus(content.toString(), { filename:styl, minify:true }, function(err, css) {
				var html = fs.readFileSync('src/client/dogo.html').toString()
				var js = combine.compileJs('src/client/dogo.js', { minify:false })
				
				html = html.replace('<script src="/require/src/client/dogo"></script>',
					'<script src="appJs.html"></script>')
				
				html = html.replace('<link rel="stylesheet" type="text/css" href="/stylus/src/client/style/dogo.styl" />',
					'<link rel="stylesheet" type="text/css" href="appCss.css" />')
				
				fs.writeFileSync(dir+'/app.html', html)
				fs.writeFileSync(dir+'/appJs.html', js) // uh ios won't read file with .js extension
				fs.writeFileSync(dir+'/appCss.css', css)
				exec('cd '+dir+' && tar cf '+dir+'.tar *')
			})
		})
	})
})
