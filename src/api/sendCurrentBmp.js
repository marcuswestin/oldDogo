var fs = require('fs')
var request = require('request')

var printerUrl = 'http://10.0.0.11'

fs.readFile('out.bmp', function(err, imageBuffer) {
	var headers = { 'Content-Length':imageBuffer.length }
	console.log("Send", headers)
	request.post({ url:printerUrl+'/img', body:imageBuffer, headers:headers, encoding:null }, function(err, res) {
		if (err) { return console.log("Printer error", err) }
		else { console.log("Printed", res.body.toString()) }
	})
})
