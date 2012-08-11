var fs = require('fs')
var semver = require('semver')

var filename = __dirname+'/../client/ios/dogo/dogo-Info.plist'

var lines = fs.readFileSync(filename).toString().split('\n')
for (var i=0; i<lines.length; i++) {
	if (lines[i].match('CFBundleShortVersionString') || lines[i].match('CFBundleVersion')) {
		var currentVersion = lines[i+1].match(/<string>(.*)<\/string>/)[1]
		var newVersion = semver.inc(currentVersion, 'patch')
		lines[i+1] = lines[i+1].replace(currentVersion, newVersion)
	}
}
fs.writeFileSync(filename, lines.join('\n'))

console.log(newVersion)
