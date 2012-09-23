var request = require('request')
var imagemagick = require('imagemagick')

var ip = '10.0.0.11'

console.log("sending")
// request.post({ url:'http://'+ip+'/', body:'s=hi' }, function(err, res) {
// 	console.log("GOT", arguments)
// })



imagemagick.convert(['test.png', '-type', 'palette', '-colors', '2', 'BMP3:out.bmp'], function(err, stdout) {
	console.log("DONE", err, stdout)
})

			// 
			// 	
			// 	{
			// 	srcData : buf,
			// 	strip : false,
			// 	width : thumbSize,
			// 	height : thumbSize+"^",
			// 	customArgs: customArgs
			// }, function(err, stdout, stderr) {
			// 	if (err) { return proceed(err) }
			// 	console.log('Uploading thumbnail', pictures.url(conversationId, pictureSecret, thumbSize))
			// 	var thumbBuf = new Buffer(stdout, 'binary')
			// 	s3.putBuffer(thumbPath, thumbBuf, s3Permission, getHeaders(thumbBuf.length), function(err, resHeaders) {
			// 		console.log('Upload thumbnail DONE', err)
			// 		callback(err, null)
			// 	})
			// })
