var fs = require('fs'),
	exec = require('child_process').exec,
	jsCompiler = require('require/compiler'),
	stylus = require('stylus'),
	nib = require('nib')

var dir = '/tmp/build/dogo-ios-build'

exec('rm -rf '+dir, function() {
	exec('mkdir -p '+dir, function() {
		fs.readdirSync('src/client').forEach(function(name) {
			var path = 'src/client/'+name,
				stat = fs.statSync(path)
			if (stat.isDirectory()) {
				jsCompiler.addPath(name, path)
			}
		})
		
		var styl = __dirname + '/../src/client/style/dogo.styl'
		fs.readFile(styl, { filename:styl }, function(err, content) {
			if (err) { return console.log(err) }
			stylus(content.toString())
				.set('filename', styl)
				.set('compress', false)
				.use(nib())
				.import('nib')
				.render(function(err, css) {
					var html = fs.readFileSync('src/client/dogo.html').toString()
					var js = jsCompiler.compile('src/client/dogo.js', { minify:false })
					
					html = html.replace('<script src="/require/src/client/dogo"></script>',
						'<script src="appJs.html"></script>')
					
					html = html.replace('<link rel="stylesheet" type="text/css" href="/stylus/src/client/style/dogo.styl" />',
						'<link rel="stylesheet" type="text/css" href="appCss.css" />')
					
					fs.writeFileSync(dir+'/app.html', html)
					fs.writeFileSync(dir+'/appJs.html', js) // uh ios won't read file with .js extension
					fs.writeFileSync(dir+'/appCss.css', css)
				})
		})
	})
})
