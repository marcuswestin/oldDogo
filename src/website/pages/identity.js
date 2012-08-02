require('lib/jquery-1.7.2')
require('tags')
style = require('tags/style')

tags.expose('div')

function fontSize(size) {
	return style({ fontSize:size })
}

function abs(top, left) {
	return style({ position:'absolute', top:top, left:left })
}

function graphic(w, h, content) {
	return div(
		div('subtitle', w,'x',h),
		div(style({ position:'relative', width:w, height:h, border:'3px solid blue', margin:10 }),
			content
		)
	)
}

$(function() {
	$('#logo').append(
		div('title', 'Icons'),
		graphic(57, 57,
			div('logo', 'Dogo', fontSize(27), abs(7, 0))
		),
		graphic(114, 114,
			div('logo', 'Dogo', fontSize(54), abs(15, 0))
		),
		div('title', 'Splash Screens'),
		graphic(320,480,
			div('logo', 'Dogo', fontSize(135), abs(122, 21))
		),
		graphic(640,960,
			div('logo', 'Dogo', fontSize(280), abs(196, 30))
		)
	)
})