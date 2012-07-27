var fs = require('fs')
var path = require('path')
var each = require('std/each')

var basePath = 'template/base'

module.exports = function buildPage(name, callback) {
	var top = templateFile('top')
	var bottom = templateFile('bottom')
	var page = pageFile(name)
	var params = {
		STYLE_NAME: 'src/web/'+(path.existsSync(pagePath(name, 'styl')) ? 'pages/'+name : basePath),
		SCRIPT_NAME: 'src/web/'+(path.existsSync(pagePath(name, 'js')) ? 'pages/'+name : basePath)
	}
	each(params, function(val, KEY) {
		var regexp = new RegExp('\\{\\{ '+KEY+' \\}\\}', 'g')
		top = top.replace(regexp, val)
		bottom = bottom.replace(regexp, val)
	})
	callback(null, top + page + bottom)
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
