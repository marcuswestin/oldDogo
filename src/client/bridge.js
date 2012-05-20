var uniqueId = 0,
	callbacks = {},
	bridgeReadyQueue = []

var bridge = module.exports = {
	command:function(command, data, responseHandler) {
		if (!responseHandler && typeof data == 'function') {
			responseHandler = data
			data = null
		}
		
		var message = { command:command, data:data || {} }
		
		if (responseHandler) {
			message.responseId = 'r' + (uniqueId++)
			callbacks[message.responseId] = responseHandler
		}

		if (window.WebViewJavascriptBridge) {
			WebViewJavascriptBridge.sendMessage(JSON.stringify(message))
		} else {
			bridgeReadyQueue.push(message)
		}
	},
	init:init
}

function init() {
	function onWebViewJavascriptBridgeReady() {
		WebViewJavascriptBridge.setMessageHandler(function(message) {
			setTimeout(function doHandleBridgeMessage() {
				try { message = JSON.parse(message) }
				catch(e) { console.log("Bad JSON", message) }
				if (message.event) {
					bridge.eventHandler(message.event, message.info)
				} else {
					var responseId = message.responseId,
						callback = callbacks[responseId]
					delete callbacks[responseId]
					typeof callback == 'function' && callback(message.error, message.data)
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
}
