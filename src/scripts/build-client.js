var fs = require('fs'),
	exec = require('child_process').exec,
	combine = require('scripts/combine'),
	path = require('path')

var dir = __dirname+'/../../build/dogo-ios-build'
var minify = false

exec('rm -rf '+dir, function() {
	exec('mkdir -p '+dir, function() {
		var styl = 'src/client/phone/phoneClient.styl'
		fs.readFile(styl, { filename:styl }, function(err, content) {
			if (err) { return console.log(err) }
			combine.compileStylus(content.toString(), { filename:styl, minify:minify }, function(err, css) {
				var html = fs.readFileSync('src/client/phone/phoneClient.html').toString()
				var js = combine.compileJs('src/client/phone/phoneClient.js', { minify:minify })
				
				html = html.replace('<script src="/require/src/client/phone/phoneClient"></script>',
					'<script src="appJs.js"></script>')
				
				html = html.replace('<link rel="stylesheet" type="text/css" href="/stylus/client/phone/phoneClient.styl" />',
					'<link rel="stylesheet" type="text/css" href="appCss.css" />')
				
				fs.writeFileSync(dir+'/app.html', html)
				fs.writeFileSync(dir+'/appJs.html', js) // uh ios won't read file with .js extension
				fs.writeFileSync(dir+'/appCss.css', css)
				fs.writeFileSync(dir+'/jquery-1.8.1.min', fs.readFileSync('src/lib/jquery-1.8.1.min.js'))
				
				exec('cd '+dir+' && tar cf '+dir+'.tar *')
			})
		})
	})
})
