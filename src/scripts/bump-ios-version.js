var fs = require('fs')
var semver = require('semver')

var filename = __dirname+'/../client/ios/dogo/dogo-Info.plist'

var lines = fs.readFileSync(filename).toString().split('\n')
for (var i=0; i<lines.length; i++) {
	if (lines[i].match('CFBundleShortVersionString') || lines[i].match('CFBundleVersion')) {
		var version = lines[i+1].match(/<string>(.*)<\/string>/)[1]
		lines[i+1] = lines[i+1].replace(version, semver.inc(version, 'patch'))
	}
}
fs.writeFileSync(filename, lines.join('\n'))

console.log(version)