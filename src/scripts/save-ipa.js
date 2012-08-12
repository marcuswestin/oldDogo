var exec = require('child_process').exec
var fs = require('fs')

var version = (function() {
	var filename = __dirname+'/../client/ios/dogo/dogo-Info.plist'

	var lines = fs.readFileSync(filename).toString().split('\n')
	for (var i=0; i<lines.length; i++) {
		if (lines[i].match('CFBundleShortVersionString') || lines[i].match('CFBundleVersion')) {
			var currentVersion = lines[i+1].match(/<string>(.*)<\/string>/)[1]
			return currentVersion
		}
	}
})();

exec('mkdir -p ~/Desktop/dogo-builds; cp ~/Desktop/dogo.ipa ~/Desktop/dogo-builds/dogo-'+version+'.ipa')
