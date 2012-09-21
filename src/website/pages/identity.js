require('lib/raphael-2.1.0')
require('tags')
require('globals/brand')
style = require('tags/style')
slice = require('std/slice')

tags.expose('div')

Raphael.fn.colorPickerIcon = function (x, y, r) {
	var pi = Math.PI;
    var segments = pi * r * 2 / Math.min(r / 8, 4);
    var a = pi / 2 - pi * 2 / segments * 1.5,
        path = ["M", x, y - r, "A", r, r, 0, 0, 1, r * Math.cos(a) + x, y - r * Math.sin(a), "L", x, y, "z"].join();
    for (var i = 0; i < segments; i++) {
        this.path(path).attr({
            stroke: "none",
            fill: "hsb(" + (segments - i) * (255 / segments) / 255 + ", 1, 1)",
            transform: "r" + [90 + (360 / segments) * i, x, y]
        });
    }
    return this.circle(x, y, r).attr({
        fill: "r#fff-#fff",
        "fill-opacity": 0,
        "stroke-width": Math.round(r * .03),
        stroke: "#fff"
    });
};

function fontSize(size) {
	return style({ fontSize:size })
}

function abs(left, top) {
	return style({ position:'absolute', top:top, left:left })
}

function graphic(w, h, content) {
	return div(
		div('subtitle', w,'x',h),
		div(style({ position:'relative', width:w, height:h, margin:10 }),
			content
		)
	)
}

function section(className, title /*, content ... */) {
	return div('section ' + className,
		div('title', title),
		slice(arguments, 2)
	)
}

function svg(w, h, callback) {
	return graphic(w, h, function($tag) {
		var paper = Raphael(0, 0, w, h)
		callback(paper)
		return paper.canvas
	})
}

function renderIcon(size, pos) {
	return div(abs(pos[0], pos[1]),
		style({ background:'url(/static/img/logoIcon-'+size+'x'+size+'.png) transparent no-repeat', backgroundSize:size+'px '+size+'px', width:size, height:size })
	)
}

$(function() {
	
	$('.sections').append(
		section('icons', 'Icons',
			graphic(57, 57,
				div(brandGradient('center', 120), renderIcon(32, [12, 12]))
			),
			graphic(114, 114,
				div(brandGradient('center', 120), renderIcon(64, [24, 24]))
			),
			graphic(72, 72,
				div(brandGradient('center', 120), renderIcon(32, [20, 20]))
			),
			graphic(144, 144,
				div(brandGradient('center', 120), renderIcon(64, [40, 40]))
			),

			div('title', 'Splash Screens'),
			graphic(320,480,
				div(brandGradient([160, 150], 110), renderIcon(128, [100, 100]))
			),
			graphic(640,960,
				div(brandGradient([320, 300], 110), renderIcon(256, [200, 200]))
			)
		),
		section('pickers', 'Pickers',	
			div('subtitle', 'Multi-color'),
			svg(100, 100, function(paper) {
				paper.colorPickerIcon(50, 50, 50)
			})
		)
	)
})
