require('globals/environment')
require('globals/tags')
require('../template/websiteTemplate')
var trim = require('std/trim')
var api = require('client/api')
var time = require('std/time')

$(function() {
	button($('#getDogo'), function() {
		setTimeout(function() {
			var emailAddress = trim(prompt("There's a waiting list for Dogo. What's your email address?"))
			if (!emailAddress) { return }
			if (!emailAddress.match('@.*\\.')) {
				return setTimeout(function() {
					alert("That does not look like an email address. Wanna try again?")
				})
			}
			api.post('api/waitlist', { emailAddress:emailAddress }, function(err, res) {
				if (err) { return alert('Oops! '+api.error(err)) }
				if (res.waitlistedSince) {
					alert(emailAddress+' was waitlisted '+res.waitlistedSince)
				} else {
					alert("You've been waitlisted! We'll be in touch soon.")
				}
			})
		}, 50)
	})
	
	button($('#logoIcon, #logoName'), function() {
		location.reload()
	})
	
	function fadeIn(selector, delay, duration) {
		setTimeout(function() {
			$(selector).css({ '-webkit-transition':'opacity '+duration+'ms', opacity:1 })
		}, delay)
	}
	fadeIn('.anim1', 100, 500)
	fadeIn('.anim2', 200, 750)
	fadeIn('.anim3', 500, 1000)
})