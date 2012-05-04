var uniqueId = 0,
	callbacks = {},
	bridgeReadyQueue = []

var bridge = module.exports = {
	command:function(command, data, responseHandler) {
		var message = { command:command, data:data }
		
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
}

function onWebViewJavascriptBridgeReady() {
	WebViewJavascriptBridge.setMessageHandler(function(message) {
		setTimeout(function() {
			try { message = JSON.parse(message) }
			catch(e) { console.log("Bad JSON", message) }
			if (message.event) {
				bridge.eventHandler(message.event, message.info)
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
