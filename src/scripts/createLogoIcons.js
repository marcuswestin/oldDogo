var fs = require('fs')
var exec = require('child_process').exec

function generate(fileName) {
	[8, 12, 16, 24, 32, 34, 48, 64, 68, 96, 128, 192, 256, 384, 512].forEach(function(size) {
		var srcPath = 'src/graphics/'+fileName
		var dstPath = 'src/graphics/logoIcon/'+fileName.replace('256x256', (size/2)+'x'+(size/2))
		var resizeCommand = ['convert', srcPath, '-resize', size+'x'+size, dstPath].join(' ')
		console.log('Command:', resizeCommand)
		exec(resizeCommand, function(err, stderr, stdout) {
			if (err || stderr) { throw err || stderr }
		})
	})
}

exec('rm -rf src/graphics/logoIcon && mkdir src/graphics/logoIcon', function(err, stderr, stdout) {
	if (err || stderr) { throw (err || stderr) }
	generate('logoIcon-blank-256x256@2x.png')
	generate('logoIcon-letter-256x256@2x.png')
})

