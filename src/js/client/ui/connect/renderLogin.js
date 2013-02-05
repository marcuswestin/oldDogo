var trim = require('std/trim')
var overlay = require('tags/overlay')

module.exports = function renderLogin(view) {
	
	// setTimeout(function() { $('#username').val('dogoUser'); $('#password').val('dogoPassword') })
	
	return div('loginView',
		div('menu',
			div('menuItem',
				input('username', { id:'username', placeholder:'Email' })
			),
			div('menuItem',
				input('password', { id:'password', placeholder:'Password', type:'password' })
			)
		),
		div('button', 'Sign in', button(function() {
			var username = trim($('#username').val())
			if (!username) {
				error('Please give me your username')
				return
			}
			
			var password = trim($('#password').val())
			if (!password) {
				error('Please give me your password')
				return
			}
			
			overlay(function() { return 'Loading...' })
			api.post('api/session', { username:username, password:password }, function(err, res) {
				overlay.hide(function() {
					if (err) { return error(err) }
					alert(JSON.stringify(res))
				})
			})
		}))
	)
}