module.exports = {
	init:init,
	command:sendCommandToObjC,
	eventHandler:eventHandler
}

var webViewJavascriptBridge

function init() {
	if (window.WebViewJavascriptBridge) {
		onWebViewJavascriptBridgeReady(WebViewJavascriptBridge)
	} else {
		document.addEventListener('WebViewJavascriptBridgeReady', function(event) {
			onWebViewJavascriptBridgeReady(event.bridge)
		})
	}
	function onWebViewJavascriptBridgeReady(_webViewJavascriptBridge) {
		webViewJavascriptBridge = _webViewJavascriptBridge
		webViewJavascriptBridge.init(function handleMessage(message, response) {
			// we only expect lifecycle events to be sent from ObjC to JS (since all the business logic lives in JS)
			// all other communication from ObjC -> JS will be in response to a message sent from JS -> ObjC
			if (message.event) {
				eventHandler(message.event, message.info)
			} else {
				alert('Received unknown message')
			}
		})
	}
}

function sendCommandToObjC(command, data, responseHandler) {
	if (!responseHandler && typeof data == 'function') {
		responseHandler = data
		data = null
	}
	webViewJavascriptBridge.callHandler(command, data, function(response) {
		responseHandler(response.error, response.responseData)
	})
}

function eventHandler(name, info) {
	events.fire(name, info)
}
