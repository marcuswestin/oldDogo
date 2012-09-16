require('../template/websiteTemplate')
require('globals/tags')

button($('#getDogo'), function() {
	setTimeout(function() {
		alert("Dogo will be available in the App Store. Come back later!")
	}, 50)
})

$(function() {
	function fadeIn(selector, delay, duration) {
		setTimeout(function() {
			$(selector).css({ '-webkit-transition':'opacity '+duration+'ms', opacity:1 })
		}, delay)
	}
	fadeIn('.anim1', 100, 500)
	fadeIn('.anim2', 200, 750)
	fadeIn('.anim3', 500, 1000)
})