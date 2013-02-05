var registration = require('data/registration')

module.exports = function renderRegister(view) {
	return div('registerStep', steps[view.registerStep || 'facebook'](view))
}

var steps = {
	facebook:renderFacebook,
	account:renderAccount,
	profile:renderProfile
}

function renderFacebook(view) {
	return div('facebookStep',
		div('button', 'Connect to Facebook', button(function() {
			overlay.show(function() { return div(style({ background:'rgba(0,0,0,.4)' }), 'Loading...') })
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
		link('No thanks', function() {
			if (!confirm('Are you quite sure?')) { return }
			gScroller.push(merge(view, { registerStep:'profile' }))
		})
	)
}

function renderProfile(view) {
	if (view.fbMe) {
		var pictureUrl
		var name = view.fbMe.name
	}
	return div('profileStep',
		div('title', 'PROFILE'),
		
		div('menu', style({ position:'absolute', width:0 }),
			div('menuItem', 'PIC', style({ width:62, height:62, borderRadius:px(5,0,0,5) }), button(function() {
				
			}))
		),
		
		div('menu profile',
			div('menuItem', input({ id:'name', value:name, placeholder:'Your Name' })),
			div('menuItem', span('placeholder pickColor', 'Your Color'), button(function() {
				
			}))
		),
		
		div('button', "That's Me!", button(function() {

			view.name = trim($('#name').val())
			var nameError = registration.checkName(view.name)
			if (nameError) { return error(nameError) }
			
			gScroller.push(merge(view, { registerStep:'account' }))
		}))
	)
}

function renderAccount(view) {
	if (view.fbMe) {
		var disable = true
		var email = view.fbMe.email
	}
	return div('accountStep',
		div('title', 'ACCOUNT'),
	
		div('menu',
			div('menuItem', input({ id:'email', value:email, placeholder:'Your Email', disabled:disable && !!email })),
			div('menuItem', input({ id:'password', placeholder:'Pick a Password' }))
		),
	
		// ul('Text any email address', 'Safe account recovery'),
		div('button', 'Register Account', button(function() {

			view.email = trim($('#email').val())
			var emailError = registration.checkEmail(view.email)
			if (emailError) { return error(emailError) }

			view.password = trim($('#password').val())
			var passwordError = registration.checkPassword(view.password)
			if (passwordError) { return error(passwordError) }
			
			if (!confirm('Is '+view.email+' correct?')) { return }
			
			overlay.show(function() { return 'Loading...' })
			api.post('api/register', { email:view.email, password:view.password, name:view.name, color:view.color, fbSession:view.facebookSession }, function(err, res) {
				overlay.hide(function() {
					if (err) { return error(err) }
				})
			})
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