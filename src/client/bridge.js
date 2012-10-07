var webViewJavascriptBridge

var bridge = module.exports = {
	command:function sendCommandToObjc(command, data, responseHandler) {
		if (!responseHandler && typeof data == 'function') {
			responseHandler = data
			data = null
		}
		webViewJavascriptBridge.callHandler(command, data, responseHandler)
	},
	init:init
}

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
			if (message.event) {
				bridge.eventHandler(message.event, message.info)
			} else {
				alert('Received unknown message')
			}
		})
	}
}
