bridge = {
	init: function(commandHandler) {
		<script module=bridge commandHandler=commandHandler>
			module = module.evaluate()
			module._commandHandler = commandHandler
		</script>
	},
	command: function(command, data, responseHandler) {
		result = { loading:true, error:null, response:null }
		<script command=command data=data responseHandler=responseHandler module=bridge result=result>
			if (!__hackFirstExecution) { return }
			var message = { command: command.asString(), data:(data && data.asJSONObject()) }
			module.evaluate()._send(message, function(error, response) {
				fun.set(result, 'loading', fun.expressions.No)
				if (error) {
					fun.set(result, 'error', fun.expressions.fromJsValue(error))
				} else if (response) {
					fun.set(result, 'response', fun.expressions.fromJsValue(response))
				}
				if (responseHandler && !responseHandler.isNull()) {
					responseHandler.evaluate().invoke([result])
				}
			})
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
			message.responseId = 'r' + (uniqueId++)
			callbacks[message.responseId] = responseHandler
		}
		
		if (window.WebViewJavascriptBridge) {
			WebViewJavascriptBridge.sendMessage(JSON.stringify(message))
		} else {
			bridgeReadyQueue.push(message)
		}
	}
	
	function onWebViewJavascriptBridgeReady() {
		WebViewJavascriptBridge.setMessageHandler(function(message) {
			setTimeout(function() {
				try { message = JSON.parse(message) }
				catch(e) { console.log("Bad JSON", message) }
				
				var responseId = message.responseId,
					callback = callbacks[responseId]
				delete callbacks[responseId]
				callback(message.error, message.data)
			})
		})
		
		for (var i=0, message; message=bridgeReadyQueue[i]; i++) {
			WebViewJavascriptBridge.sendMessage(JSON.stringify(message))
		}
		delete bridgeReadyQueue
	}
	
	if (window.WebViewJavascriptBridge) {
		onWebViewJavascriptBridgeReady()
	} else {
		document.addEventListener('WebViewJavascriptBridgeReady', onWebViewJavascriptBridgeReady)
	}
</script>
