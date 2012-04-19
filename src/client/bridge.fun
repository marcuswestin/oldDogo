bridge = {
	command: function(command, data, responseHandler) {
		result = { pending:true, error:null, response:null }
		<script command=command data=data responseHandler=responseHandler>
			if (!__hackFirstExecution) { return }
			var message = {
				command: command.asString(),
				data: data.asJSONObject()
			}
			WebViewJavascriptBridge.sendMessage(JSON.stringify(message))
		</script>
		return result
	},
	hackPhoneNumber:null
}

<script bridge=bridge>
	if (window.WebViewJavascriptBridge) { start() }
	else { document.addEventListener('WebViewJavascriptBridgeReady', start) }
	function start() {
		WebViewJavascriptBridge.setMessageHandler(function(message) {
			setTimeout(function() {
				message = JSON.parse(message)
				handlers[message.command](message.data)
			})
		})
	}
	
	var url = require('fun/node_modules/std/url'),
		xhr = require('fune/node_modules/std/xhr')
	
	var handlers = {
		passthrough: function(data) {
			var passthroughUrl = url(decodeURIComponent(data.url)),
				authToken = passthroughUrl.getSearchParam('t'),
				args = { phone_number:bridge.getContent()['hackPhoneNumber'].getContent(), auth_token:authToken }
			xhr.post('/api/session', args, function(err, res) {
				alert("RESPONSE " + JSON.stringify({err:err, res:res}))
			})
		}
	}
</script>