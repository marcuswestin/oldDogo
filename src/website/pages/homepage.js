require('../template/websiteTemplate')

tags = require('tags/tags')
button = require('tags/button')
sessionInfo = require('client/state/sessionInfo')

var trim = require('std/trim')
var api = require('client/misc/api')

$(function() {
	button($('#getDogo'), function() {
		setTimeout(function() {
			var emailAddress = trim(prompt("Dogo is invite-only.\Add your email address to the waitlist:"))
			if (!emailAddress) { return }
			if (!emailAddress.match('@.*\\.')) {
				return setTimeout(function() {
					alert("That does not look like an email address. Wanna try again?")
				})
			}
			api.post('api/waitlist', { emailAddress:emailAddress }, function(err, res) {
				if (err) { return alert('Oops! '+api.error(err)) }
				alert(res)
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