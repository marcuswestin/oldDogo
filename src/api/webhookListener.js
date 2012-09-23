var http = require('http')
var request = require('request')
var fs = require('fs')
var imagemagick = require('imagemagick')

var printerUrl = 'http://10.0.0.11'

http.createServer(function(req, res) {
	parseJsonPostBody(req, function(err, notification) {
		if (err) { return res.end(400) }
		console.log("webhook listener", notification)
		if (notification.event == 'message') {
			var message = notification.message
			var sentFrom = notification.from
			// message.sentTime, body, pictureId, pictureSecret, pictureWidth, pictureHeight
			if (message.body) {
				request.post({ url:printerUrl+'/txt', form:{ s:sentFrom+' says: "'+message.body+'"' } }, function(err, res) {
					if (err) { console.log("Printed error", err) }
					else { console.log("Printed") }
				})
			} else if (message.picture) {
				request.get(message.picture, convertImage).pipe(fs.createWriteStream('img.png'))
				function convertImage() {
					imagemagick.convert(['img.png', '-flip', '-resize','384x384!', '-type','palette', '-colors','2', 'BMP3:out.bmp'], function(err, stdout) {
						fs.readFile('out.bmp', function(err, imageBuffer) {
							var headers = { 'Content-Length':imageBuffer.length }
							console.log("Send", headers)
							request.post({ url:printerUrl+'/img', body:imageBuffer, headers:headers }, function(err, res) {
								if (err) { return console.log("Printer error", err) }
								else { console.log("Printed", res.body) }
							})
						})
					})
				}
			}
		}
	})
}).listen(9090)

function parseJsonPostBody(req, callback) {
	var result = ''
	req.on('data', function(data) { result += data })
	req.on('end', function() {
		try { var json = JSON.parse(result) }
		catch(e) { return callback(e, null) }
		callback(null, json)
	})
}

