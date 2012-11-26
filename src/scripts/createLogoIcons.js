var fs = require('fs')
var exec = require('child_process').exec

exec('rm -rf src/graphics/logoIcon && mkdir src/graphics/logoIcon', function(err, stderr, stdout) {
	if (err || stderr) { throw (err || stderr) }
	[8, 12, 16, 24, 32, 34, 48, 64, 68, 96, 128, 192, 256, 384, 512].forEach(function(size) {
		var sizeName = size+'x'+size
		var sizeNameRetina = (size/2)+'x'+(size/2)+'@2x'
		var srcPath = 'src/graphics/logoIcon2.png'
		var filePath = 'src/graphics/logoIcon/logoIcon-'+sizeName+'.png'
		var resizeCommand = ['convert', srcPath, '-resize', sizeName, filePath].join(' ')
		console.log('Command:', resizeCommand)
		exec(resizeCommand, function(err, stderr, stdout) {
			if (err || stderr) { throw err || stderr }
			var copyCommand = ['cp', filePath, filePath.replace(sizeName, sizeNameRetina)].join(' ')
			exec(copyCommand, function(err, stderr, stdout) {
				if (err || stderr) { throw err || stderr }
				console.log(sizeName, sizeNameRetina, 'done')
			})
		})
	})
})

