var fs = require('fs')
var path = require('path')
var each = require('std/each')
var options = require('std/options')
var combine = require('../combine')

var basePath = 'template/base'

module.exports = function buildPage(name, opts, callback) {
	if (!callback) {
		callback = opts
	}
	opts = options(opts, {
		combine:false,
		minify:false
	})
	var top = templateFile('top')
	var bottom = templateFile('bottom')
	var page = pageFile(name)
	var params = {
		STYLE_NAME: 'src/website/'+(path.existsSync(pagePath(name, 'styl')) ? 'pages/'+name : basePath),
		SCRIPT_NAME: 'src/website/'+(path.existsSync(pagePath(name, 'js')) ? 'pages/'+name : basePath)
	}
	each(params, function(val, KEY) {
		var regexp = new RegExp('\\{\\{ '+KEY+' \\}\\}', 'g')
		top = top.replace(regexp, val)
		bottom = bottom.replace(regexp, val)
	})
	
	var html = top + page + bottom
	
	if (opts.combine) {
		var script = html.match(/<script src="\/require\/([^"]+)"><\/script>/i)
		if (script) {
			var filePath = script[1]+'.js'
			var compiledJs = combine.compileJs(filePath, { minify:opts.minify })
			html = html.replace(script[0], '<script>\n'+compiledJs+'\n</script>')
		}
		var stylusMatch = html.match(/<link[^\n]*href="([^"]+)\.styl"[^\n]*\/?>/i)
		if (stylusMatch) {
			combine.compileStylusPath(stylusMatch[1], { minify:opts.minify }, function(err, css) {
				if (err) { throw err}
				html = html.replace(stylusMatch[0], '<style type="text/css">'+css+'</style>')
				callback(null, html)
			})
		} else {
			callback(null, html)
		}
	} else {
		callback(null, html)
	}
}

function pageFile(name, ext) {
	return fs.readFileSync(pagePath(name, ext)).toString()
}

function pagePath(name, ext) {
	return __dirname+'/pages/'+name+'.'+(ext || 'html')
}

function templateFile(name) {
	return fs.readFileSync(__dirname+'/template/'+name+'.html').toString()
}
