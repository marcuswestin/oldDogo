var trim = require('std/trim')
var overlay = require('tags/overlay')
var registration = require('data/registration')

// setTimeout(function() { gScroller.push({ 'step':'login', password:'123123', email:'narcvs@gmail.com' }) }, 500) // AUTOS

module.exports = function renderLogin(view) {
	
	return div('loginView', style(translate.y(310)),
		div('listMenu',
			div('menuItem',
				listMenuIcon('listMenuPerson'),
				input('username', { id:'email', placeholder:'Email', type:'email', value:view.email })
			),
			div('menuItem',
				listMenuIcon('listMenuLock'),
				input('password', { id:'password', placeholder:'Password', type:'password', value:view.password })
			)
		),
		
		div('button', connectButton, 'Sign in', button(function signIn() {
			var email = trim($('#email').val())
			if (!email) {
				error('Please give me your email')
				return
			}
			
			var password = trim($('#password').val())
			if (!password) {
				error('Please give me your password')
				return
			}
			
			overlay.show('Loading...')
			api.post('api/session', { address:Addresses.email(email), password:password }, function(err, res) {
				overlay.hide(function() {
					if (err) { return error(err) }
					sessionInfo.save(res.sessionInfo)
				})
			})
		}))
	)
}