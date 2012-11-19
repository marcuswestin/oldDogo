var fs = require('fs')
var exec = require('child_process').exec

exec('rm -f src/graphics/logoIcon/*@2x.png', function(err, stderr, stdout) {
	if (err || stderr) { throw (err || stderr) }
	fs.readdirSync('src/graphics/logoIcon').forEach(function(file) {
		var match = file.match(/logoIcon-(\d+x\d+)\.png/)
		if (!match) { return }
		var size = parseInt(match[1])
		exec('cp src/graphics/logoIcon/'+file+' src/graphics/logoIcon/'+file.replace(match[1], (size/2)+'x'+(size/2)+'@2x'), function() {
			console.log(size, 'done')
		})
	})	
})

