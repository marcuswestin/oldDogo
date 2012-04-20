bridge = {
	init: function(commandHandler) {
		<script module=bridge commandHandler=commandHandler>
			module = module.evaluate()
			module._commandHandler = commandHandler
		</script>
	},
	command: function(command, data, responseHandler) {
		result = { pending:true, error:null, response:null }
		<script command=command data=data responseHandler=responseHandler module=bridge>
			if (!__hackFirstExecution) { return }
			
			module = module.evaluate()
			
			var message = {
				command: command.asString(),
				data: data.asJSONObject()
			}
			
			if (responseHandler) {
				message.callbackID = 'cb' + (module._callbackId++)
				module._callbacks[message.callbackID] = responseHandler
			}
			
			WebViewJavascriptBridge.sendMessage(JSON.stringify(message))
		</script>
		return result
	},
	hackPhoneNumber:null
}


<script module=bridge>
	module = module.evaluate()
	module._callbacks = {}
	module._callbackId = 0
	
	if (window.WebViewJavascriptBridge) { start() }
	else { document.addEventListener('WebViewJavascriptBridgeReady', start) }
	function start() {
		WebViewJavascriptBridge.setMessageHandler(function(message) {
			setTimeout(function() {
				message = JSON.parse(message)
				var handler = message.responseID
					? module._callbacks[message.responseID]
					: handlers[message.command]
				console.log('got '+(message.responseID ? 'response' : 'command'), message.data)
				handler.invoke(null, message.data)
			})
		})
		
		window.console = {
			log: function() {
				var args = Array.prototype.slice.call(arguments)
				setTimeout(function() {
					WebViewJavascriptBridge.sendMessage(JSON.stringify({ command:'console.log', data:args }))
				}, 0)
			}
		}
		
		console.log('bridge initialized')
	}
</script>
