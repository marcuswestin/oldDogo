var fs = require('fs')

module.exports = function buildPage(name, callback) {
	var top = fs.readFileSync(__dirname+'/template/top.html').toString()
	var bottom = fs.readFileSync(__dirname+'/template/bottom.html').toString()
	var page = fs.readFileSync(__dirname+'/pages/'+name+'.html').toString()
	callback(null, top + page + bottom)
}
