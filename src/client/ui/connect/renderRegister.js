var registration = require('data/registration')
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
// setTimeout(function() { pictureSecretPromise = new Promise().fulfill(null, '7d005216-78f6-4bf6-bd93-44843d265f3c'); gScroller.push({ step:'register', registerStep:'account', password:'123123', email:'narcvs@gmail.com', name:'Marc Westin' }) }, 500) // AUTOS

function renderFacebook(view) {
	return div('facebookStep', style(fullWidth, { position:'absolute', bottom:0 }),
		div(style({ color:'#fff', textShadow:'0 1px 0 rgba(0,0,0,.2)', margin:px(0, 2*unit, 0, 2*unit) }),
			ul(
				'Speed up registration',
				'Skip email verification',
				'Message with Facebook friends'
			)
		),
		
		div('listMenu', div('menuItem',
			listMenuContent('listMenuFacebook', 'Speed up Registration'),
			button(function() {
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
			})
		)),
		
		div(style({ margin:px(3.75*unit, 0), textAlign:'center' }),
			link('No thanks >', delayed(function() {
				if (!confirm('Are you quite sure?')) { return }
				gScroller.push(merge(view, { registerStep:'profile' }))
			}))
		)
	)
}

var Promise = require('std/Promise')
var pictureSecretPromise = new Promise().fulfill() // we fulfill it right away to account for the no-picture-selected case
function renderProfile(view) {
	if (view.fbMe) {
		var pictureUrl
		var name = view.fbMe.name
		var fbPic = { src:face.facebookUrl(view.fbMe.id) }
	}
	
	var picSize = 6*unit
	var insetShadow = 'inset 0 3px 4px -1px rgba(0,0,0,.27)'
	return div('profileStep', style(fillWidth, { position:'absolute', bottom:0 }),
		div(style({ margin:unit, padding:unit, background:'#fff', borderRadius:px(2) }),
			img({ id:'picture' }, fbPic, button(_pickPhoto), style(graphics.background('listMenuPerson', 20, 20, unit*2-2, unit*2-2), {
				'float':'left', margin:px(0,unit,0,0), width:picSize, height:picSize,
				borderRadius:px(2,0,0,2), boxShadow:insetShadow
			})),
			
			input({ id:'name', value:name, placeholder:'Your name' }, style({
				boxShadow:insetShadow, borderRadius:px(0,2,2,0), width:214,
				padding:px(unit/4, unit/2), margin:px(0,0,unit/4,0), border:'1px solid #ccc'
			})),

			div(style(translate.y(0)), 'Your picture and name')
		),
		
		div('button', connectButton, style({ margin:unit }), 'Next', button(function() {
			view.name = trim($('#name').val())
			var nameError = registration.checkName(view.name)
			if (nameError) { return error(nameError) }
			
			if (!view.mediaId && !fbPic) { return error('Pick a photo please') }
			
			gScroller.push(merge(view, { registerStep:'account' }))
		}))
	)
	
	function _pickPhoto() {
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
	}
}

var verificationInfo = null
function renderAccount(view) {
	if (view.fbMe && view.fbMe.email && !Addresses.isFacebookProxyEmail(view.fbMe.email)) {
		var disable = true
		var email = view.fbMe.email
	} else {
		var email = view.email
	}
	return div('accountStep', style({ position:'absolute', bottom:0 }),
		div('listMenu',
			div('menuItem', listMenuIcon('listMenuPerson'), input({ id:'email', value:email, placeholder:'Your Email', disabled:disable && !!email, type:'email' })),
			div('menuItem', listMenuIcon('listMenuLock'), input({ id:'password', value:view.password, placeholder:'Pick a Password' }))
		),
	
		// ul('Text any email address', 'Safe account recovery'),
		div('button', connectButton, 'Register Account', button(function() {

			view.email = trim($('#email').val())
			var emailError = registration.checkAddress(Addresses.email(view.email))
			if (emailError) { return error(emailError) }

			view.password = trim($('#password').val())
			var passwordError = registration.checkPassword(view.password)
			if (passwordError) { return error(passwordError) }
			
			$('input').blur()
			
			if (view.fbMe && view.fbMe.email && !Addresses.isFacebookProxyEmail(view.fbMe.email)) {
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
				var params = { address:address, password:view.password, name:view.name, pictureSecret:pictureSecret, fbSession:view.fbSession }
				api.post('api/register/withFacebookSession', params, function(err, res) {
					if (err) { overlay.hide(); error(err); return }
					api.post('api/session', { address:address, password:view.password }, function(err, res) {
						overlay.hide(function() {
							if (err) { return error(err) }
							sessionInfo.save(res.sessionInfo)
						})
					})
				})
			}
			
			function _requestAddressVerification(pictureSecret) {
				overlay.show('Loading...')
				var params = { address:Addresses.email(view.email), password:view.password, name:view.name, pictureSecret:pictureSecret }
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
					sessionInfo.save(res.sessionInfo)
				})
			})
		}
	}
})

