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
			module.evaluate()._send({
				command: command.asString(),
				data: data.asJSONObject()
			}, responseHandler)
		</script>
		return result
	}
}


<script module=bridge>
	module = module.evaluate()
	
	var uniqueId = 0,
		callbacks = {},
		bridgeReadyQueue = []
	module._send = function(message, responseHandler) {
		if (responseHandler) {
			message.callbackID = 'cb' + (uniqueId++)
			callbacks[message.callbackID] = responseHandler
		}
		
		if (window.WebViewJavascriptBridge) {
			WebViewJavascriptBridge.sendMessage(JSON.stringify(message))
		} else {
			bridgeReadyQueue.push(message)
		}
	}
	
	if (window.WebViewJavascriptBridge) {
		onWebViewJavascriptBridgeReady()
	} else {
		document.addEventListener('WebViewJavascriptBridgeReady', onWebViewJavascriptBridgeReady)
	}
	
	function onWebViewJavascriptBridgeReady() {
		WebViewJavascriptBridge.setMessageHandler(function(message) {
			setTimeout(function() {
				message = JSON.parse(message)
				var handler = message.responseID
					? callbacks[message.responseID]
					: handlers[message.command]
				console.log('got '+(message.responseID ? 'response' : 'command'), message.data)
				handler.invoke(null, message.data)
			})
		})
		
		console.log('bridge initialized')
		
		for (var i=0, message; message=bridgeReadyQueue[i]; i++) {
			WebViewJavascriptBridge.sendMessage(JSON.stringify(message))
		}
		delete bridgeReadyQueue
	}
</script>
