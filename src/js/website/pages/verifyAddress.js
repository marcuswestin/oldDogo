require('client/globals')
require('website/template/scrollToTop')

;(function run() {
	$('#viewport').empty().css({ minHeight:viewport.height() + 60, minWidth:viewport.width() }).append(
		div({ id:'content' },
			'asd'
		)
	)
	
	var url = location.toString()
	var path = url.substr(url.indexOf(location.pathname))
	// /verify?v=14123&t=1781x1-asdaug87q2a-soa7lg3-asda&y=email&a=narcvs%40gmail.com
	if (appIsMarkedAsInstalled()) {
		attemptOpenApp()
		setTimeout(renderUi)
	} else {
		onAppNotInstalled()
	}
	
	function appIsMarkedAsInstalled() {
		try { return JSON.parse(localStorage['appInstalledInfo']) }
		catch(e) { return null }
	}
	
	function attemptOpenApp() {
		localStorage['appInstalledInfo'] = JSON.stringify({ time:new Date().getTime() })
		openApp('dogo://handlePath'+path, onAppNotInstalled)
	}
	
	function onAppNotInstalled() {
		localStorage['appInstalledInfo'] = ''
		renderUi()
	}
	
	function renderUi() {
		$('#content').html("<div id='openDogo'>Open Dogo</div>")
		$('#openDogo').on('click', attemptOpenApp)
	}
}())

// openApp('myapp://foo/bar?qwe=cat', function noApp() { alert('You should install myapp!') })
function openApp(appUrl, noAppCallback) {
	var isAndroid = /Android/.test(window.navigator.userAgent)
	var delayBeforeCheck = isAndroid ? 500 : 1000
	var acceptableElapse = isAndroid ? 100 : 500
	var startTime = new Date().getTime()
	setTimeout(_attemptOpen, 50)
	
	function _attemptOpen() {
		var iframe = document.createElement("iframe")
		iframe.src = appUrl
		iframe.style.display = 'none'
		document.body.appendChild(iframe)
		setTimeout(_checkIfDidOpen, delayBeforeCheck)
	}
	
	function _checkIfDidOpen() {
		var elapsedTime = new Date().getTime() - startTime
		var appDidOpen = (elapsedTime > delayBeforeCheck + acceptableElapse)
		if (!appDidOpen) {
			noAppCallback()
		}
	}
}
