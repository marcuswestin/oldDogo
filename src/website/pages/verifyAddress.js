require('client/misc/clientGlobals')
require('website/template/scrollToTop')

var url = require('std/url')

;(function run() {
	$('#viewport').empty().css({ minHeight:viewport.height() + 60, minWidth:viewport.width() }).append(
		div({ id:'content' })
	)
	
	var appUrl = url(location).setProtocol('dogo://')
	// dogo://dogo.co/verify?v=14123&t=1781x1-asdaug87q2a-soa7lg3-asda&y=email&a=narcvs%40gmail.com
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
		openApp(appUrl.toString(), onAppNotInstalled)
	}
	
	function onAppNotInstalled() {
		localStorage['appInstalledInfo'] = ''
		renderUi()
	}
	
	function renderUi() {
		var urlParams = appUrl.getSearchParams()
		var address = Addresses.fromVerificationParams(urlParams)
		$('#content').empty().append(
			div('logo', 'Dodo'),
			div({ id:'body' },
				div('info', 'Verify your address'),
				div('listMenu',
					div('menuItem', input({ value:address && address.addressId, disabled:true })),
					div('menuItem', input({ id:'password', placeholder:'Dogo Password', type:'password' }))
				),
				div('button', { id:'verifyButton' }, 'Verify My Address', button(function() {
					var params = {
						verificationSecret: urlParams.s,
						verificationId: urlParams.i,
						password:$('#password').val()
					}
					if (urlParams.personId) {
						// TODO This is a verification of an additional address
					} else {
						api.post('api/register/withAddressVerification', params, function(err, res) {
							if (err) { return error(err) }
							gConfigure(res.config)
							_renderPerson(res.person)
						})
					}
				}))
			)
		)
	}
	
	function _renderPerson(person) {
		$('#password')[0].disabled = true
		$('#verifyButton').replaceWith(
			div('card',
				div('person',
					div('face', style({ width:80, height:80, background:'url('+face.personUrl(person.personId)+')', backgroundSize:'80px 80px' })),
					div('name', function() {
						var names = person.name.split(' ')
						return [div('first', names.shift()), div('rest', names.pop())]
					})
				)
			)
		)
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
