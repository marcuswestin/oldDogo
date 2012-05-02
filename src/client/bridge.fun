bridgeHandler = null

bridge = {
	command: function(command, data, responseHandler) {
		result = { loading:true, error:null, response:null }
		<script command=command data=data responseHandler=responseHandler module=bridge result=result>
			if (!__hackFirstExecution) { return }
			result = result.evaluate()
			var message = { command: command.toString(), data:(data && data.toJSON()) }
			module.evaluate()._send(message, function(error, response) {
				fun.dictSet(result, 'loading', fun.expressions.No)
				if (error) {
					fun.dictSet(result, 'error', error)
				} else if (response) {
					fun.dictSet(result, 'response', response)
				}
				if (responseHandler && !responseHandler.isNull()) {
					responseHandler.evaluate().invoke([result])
				}
			})
		</script>
		return result
	},
	eventHandler: bridgeHandler
}


<script module=bridge bridgeHandler=bridgeHandler>
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
				
				if (message.command) {
					if (message.command != 'handleEvent') { return console.log("Unknown command", message.command) }
					var event = fun.value({ name:message.name, data:message.data })
					bridgeHandler.invoke([event])
				} else {
					var responseId = message.responseId,
						callback = callbacks[responseId]
					delete callbacks[responseId]
					callback(message.error, message.data)
				}
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
