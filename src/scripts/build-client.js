var fs = require('fs'),
	exec = require('child_process').exec,
	combine = require('combine'),
	path = require('path')

var dir = __dirname+'/../../build/dogo-ios-build'
var minify = true

exec('rm -rf '+dir, function() {
	exec('mkdir -p '+dir, function() {
		var styl = 'src/js/client/dogo.styl'
		fs.readFile(styl, { filename:styl }, function(err, content) {
			if (err) { return console.log(err) }
			combine.compileStylus(content.toString(), { filename:styl, minify:minify }, function(err, css) {
				var html = fs.readFileSync('src/js/client/dogo.html').toString()
				var js = combine.compileJs('src/js/client/dogo.js', { minify:minify })
				
				html = html.replace('<script src="/require/src/js/client/dogo"></script>',
					'<script src="appJs.js"></script>')
				
				html = html.replace('<link rel="stylesheet" type="text/css" href="/stylus/client/dogo.styl" />',
					'<link rel="stylesheet" type="text/css" href="appCss.css" />')
				
				fs.writeFileSync(dir+'/app.html', html)
				fs.writeFileSync(dir+'/appJs.html', js) // uh ios won't read file with .js extension
				fs.writeFileSync(dir+'/appCss.css', css)
				exec('cd '+dir+' && tar cf '+dir+'.tar *')
			})
		})
	})
})
