var registration = require('data/registration')
var colors = require('client/colors')
var url = require('std/url')

module.exports = function renderRegister(view) {
	return div('registerStep', steps[view.registerStep || 'facebook'](view))
}

var steps = {
	facebook:renderFacebook,
	account:renderAccount,
	profile:renderProfile
}

// setTimeout(function() { gScroller.push({ step:'register', registerStep:'facebook' }) }, 500) // AUTOS

function renderFacebook(view) {
	return div('facebookStep', style(translate.y(310)),
		div('button', 'Connect to Facebook', button(function() {
			overlay.show('Loading...')
			bridge.command('facebook.connect', { permissions:['email','friends_birthday'] }, function(err, data) {
				if (err || !data.facebookSession || !data.facebookSession.accessToken) {
					overlay.hide(function() {
						return error('I was unable to connect to your Facebook')
					})
				}
				
				bridge.command('facebook.request', { path:'/me' }, function(err, fbMe) {
					overlay.hide(function() {
						if (err) { return error('I was unable to connect to your Facebook') }
						
						gScroller.push(merge(view, { registerStep:'profile', fbMe:fbMe, fbSession:data.facebookSession }))
					})
				})
			})
		})),
		ul(
			'Speed up registration',
			'Text to Facebook friends'
		),
		link('No thanks', delayed(function() {
			if (!confirm('Are you quite sure?')) { return }
			gScroller.push(merge(view, { registerStep:'profile' }))
		}))
	)
}

var LEFT = 25

var Promise = require('std/Promise')
var pictureSecretPromise = new Promise().fulfill() // we fulfill it right away to account for the no-picture-selected case
function renderProfile(view) {
	if (view.fbMe) {
		var pictureUrl
		var name = view.fbMe.name
		var fbPic = { src:face.facebookUrl(view.fbMe.id) }
	}
	
	var colorDot = div({ id:'colorDot' }, style(absolute(213,84), { width:71, height:20, borderRadius:24, border:'1px solid rgba(255,255,255,.75)', boxShadow:'inset 0 1px 1px rgba(0,0,0,.4), inset 0 -1px 1px -1px #fff' }))
	var picSize = 75
	var pad = 12
	
	return div('profileStep', style(translate.y(282)),
		div('title', 'PROFILE', style({ marginLeft:LEFT })),
		
		div('listMenu', style({ width:0 }, absolute(LEFT, 29)),
			img('menuItem', { id:'picture' }, fbPic, style({ padding:px(5, 6, 7), width:picSize, height:picSize, borderRadius:px(5,0,0,5) }), button(function() {
				bridge.command('media.pick', { source:'camera', cameraDevice:'front', allowsEditing:true }, function(err, res) {
					if (!res.mediaId) { return }
					var thisPictureSecretPromise = pictureSecretPromise = new Promise()
					view.mediaId = res.mediaId
					$('#picture')[0].src = '/blowtorch/media/'+res.mediaId+'.jpg'
					var params = {
						url:api.getUrl('api/address/verification/picture'),
						headers:api.getHeaders(),
						jsonParams:{ width:res.width, height:res.height },
						boundary:'______webkit',
						parts:{ picture:res.mediaId }
					}
					bridge.command('media.upload', params, function(err, res) {
						if (err) { error(err) }
						thisPictureSecretPromise.fulfill(res && res.pictureSecret) // instead of view.pictureSecret as it may take a while for upload to finish
					})
				})
			}))
		),
		
		div('listMenu profile',
			div('menuItem', input({ id:'name', value:name, placeholder:'Your Name' })),
			div('menuItem', span('placeholder pickColor', 'Your Color:'), colorDot, button(function() {
				var padding = 1
				var colorMargin = 1
				var colorWidth = 88
				var colorStyles = { width:colorWidth, height:37, margin:colorMargin, borderRadius:2, 'float':'left', boxShadow:'inset 0 1px 0 0 rgba(255,255,255,.5), inset 0 -1px 2px rgba(0,0,0,.3)' }
				$('#name').blur()
				overlay.show({ height:300 + padding*2, width:colorWidth * 3 + padding*2 + colorMargin * 6, dismissable:false}, function() {
					return div(
						style({ background:'#fff', borderRadius:4, padding:padding, boxShadow:'0 1px 2px rgba(0,0,0,.75)' }, translate.y(-62)),
						list({
							items:map(colors, function(rgb, i) { return { rgb:rgb, id:i+1 } }),
							renderItem:renderColor,
							selectItem:function(color) {
								overlay.hide()
								$('#colorDot').css(transition('background', 500)).css({ background: colors.rgba(color.rgb, .6) })
								$('.pickColor.placeholder').css(transition('color', 500)).css({ color:'#222' })
								view.color = color.id
							}
						}),
						div('clear')
					)
					
					function renderColor(color) {
						return div(style(colorStyles, { background:colors.rgb(color.rgb) }))
					}
				})
			}))
		),
		
		div('button', "Register Me", button(function() {

			view.name = trim($('#name').val())
			var nameError = registration.checkName(view.name)
			if (nameError) { return error(nameError) }
			
			gScroller.push(merge(view, { registerStep:'account' }))
		}))
	)
}

// setTimeout(function() { pictureSecretPromise = new Promise().fulfill(null, '7d005216-78f6-4bf6-bd93-44843d265f3c'); gScroller.push({ step:'register', registerStep:'account', password:'123123', email:'narcvs@gmail.com', color:1, name:'Marc Westin' }) }, 500) // AUTOS

var verificationInfo = null
function renderAccount(view) {
	if (view.fbMe) {
		var disable = true
		var email = view.fbMe.email
	} else {
		var email = view.email
	}
	return div('accountStep', style(translate.y(282)),
		div('title', 'ACCOUNT'),
	
		div('listMenu',
			div('menuItem', input({ id:'email', value:email, placeholder:'Your Email', disabled:disable && !!email, type:'email' })),
			div('menuItem', input({ id:'password', value:view.password, placeholder:'Pick a Password' }))
		),
	
		// ul('Text any email address', 'Safe account recovery'),
		div('button', 'Register Account', button(function() {

			view.email = trim($('#email').val())
			var emailError = registration.checkAddress(Addresses.email(view.email))
			if (emailError) { return error(emailError) }

			view.password = trim($('#password').val())
			var passwordError = registration.checkPassword(view.password)
			if (passwordError) { return error(passwordError) }
			
			$('input').blur()
			
			if (view.fbMe) {
				overlay.show('Uploading picture...')
				pictureSecretPromise.add(_registerWithFacebookSession)
			} else {
				setTimeout(function() { // for the confirm call to be async to button.
					if (!confirm('Is '+view.email+' correct?')) { return }
					pictureSecretPromise.add(_requestAddressVerification)
				})
			}
			
			function _registerWithFacebookSession(pictureSecret) {
				overlay.show('Loading...')
				var address = Addresses.email(view.email)
				var params = { address:address, password:view.password, name:view.name, color:view.color, pictureSecret:pictureSecret, fbSession:view.fbSession }
				api.post('api/register/withFacebookSession', params, function(err, res) {
					if (err) { overlay.hide(); error(err); return }
					api.post('api/session', { address:address, password:view.password }, function(err, res) {
						overlay.hide(function() {
							if (err) { return error(err) }
							events.fire('user.session', res.sessionInfo)
						})
					})
				})
			}
			
			function _requestAddressVerification(pictureSecret) {
				overlay.show('Loading...')
				var params = { address:Addresses.email(view.email), password:view.password, name:view.name, color:view.color, pictureSecret:pictureSecret }
				verificationInfo = { password:params.password }
				api.post('api/address/verification', params, function(err, res) {
					if (err) { return error(err) }
					verificationInfo.verificationId = res.verificationId
					overlay.show({ dismissable:false }, function() { return 'Check '+view.email+' for a verification link - then you are done.' })
				})
			}
		}))
	)
}

function renderPushNotifications(view, onDone) {
	return div(style({ marginTop:300 }),
		div('button', 'Enable Notifications', button(function() {
			$(this).text('Enabling...').addClass('active')
			bridge.command('push.register', function(err) { onDone() })
		})),
		link('noNotifications', 'no thanks', function() {
			setTimeout(function() {
				var warning = "You must enable notifications for Dogo to work properly"
				if (!confirm(warning)) { return }
				onDone()
			})
		})
	)
}

events.on('push.registerFailed', function(info) {
	alert("Oh no! Notifications were not enabled. Go to your settings app and enable notifications for Dogo.")
})

events.on('app.didOpenUrl', function(info) {
	var appUrl = url(info.url)
	if (appUrl.pathname != '/verify') { return }
	var urlParams = appUrl.getSearchParams()
	var address = Addresses.fromVerificationParams(urlParams)
	var password = verificationInfo && verificationInfo.password
	if (password) {
		overlay.show('Verifying '+address.addressId+'...')
		_doVerify(password, function() { })
	} else {
		overlay.show(div(
			input({ id:'verifyPassword', type:'password', placeholder:'password' }),
			div('button', 'Verify ' + address.addressId, button(function() {
				_doVerify($('#password').val())
			}))
		))
	}
	
	function _doVerify(password, onVerified) {
		if (gState.getSessionInfo('authToken')) {
			// adding address
		} else {
			api.post('api/register/withAddressVerification', { password:verificationInfo.password, verificationId:urlParams.i, verificationToken:urlParams.t }, function(err, res) {
				if (err) { return error(err); }
				api.post('api/session', { address:address, password:verificationInfo.password }, function(err, res) {
					if (err) { return error(err) }
					overlay.hide()
					onVerified()
					events.fire('user.session', res.sessionInfo)
				})
			})
		}
	}
})

