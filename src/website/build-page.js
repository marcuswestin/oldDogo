var fs = require('fs')
var each = require('std/each')
var options = require('std/options')
var combine = require('../combine')
var marked = require('marked')

var basePath = 'template/websiteTemplate'

var existsSync = fs.existsSync || require('path').existsSync

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
		STYLE_NAME: 'website/'+(existsSync(pagePath(name, 'styl')) ? 'pages/'+name : basePath),
		SCRIPT_NAME: 'website/'+(existsSync(pagePath(name, 'js')) ? 'pages/'+name : basePath)
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
			var filePath = 'src/'+script[1]+'.js'
			var compiledJs = combine.compileJs(filePath, { minify:opts.minify })
			
			var BACKREFERENCE_WORKAROUND = '____________backreference_workaround________'
			compiledJs = compiledJs.replace('\$\&', BACKREFERENCE_WORKAROUND)
			html = html.replace(script[0], '<script>\n'+compiledJs+'\n</script>')
			html = html.replace(BACKREFERENCE_WORKAROUND, '\$\&')
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
	var filePath = pagePath(name, ext)
	var content = fs.readFileSync(filePath).toString()
	if (filePath.match(/\.md$/)) {
		content = marked(content)
	}
	return content
}

function pagePath(name, ext) {
	var base = __dirname+'/pages/'+name+'.'
	if (!ext) {
		if (existsSync(base+'md')) {
			ext = 'md'
		} else {
			ext = 'html'
		}
	}
	return base+ext
}

function templateFile(name) {
	return fs.readFileSync(__dirname+'/template/'+name+'.html').toString()
}
