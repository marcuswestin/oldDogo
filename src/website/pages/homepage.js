require('../template/websiteTemplate')
require('lib/jquery-1.7.2')
require('globals/tags')

button($('#getDogo'), function() {
	console.log("HERE")
})

$(function() {
	function fadeIn(selector, delay, duration) {
		setTimeout(function() {
			console.log("here")
			$(selector).css({ '-webkit-transition':'opacity '+duration+'ms', opacity:1 })
		}, delay)
	}
	fadeIn('.anim1', 100, 500)
	fadeIn('.anim2', 200, 750)
	fadeIn('.anim3', 500, 1000)
})