require('lib/raphael-2.1.0')
require('globals/brand')
style = require('tags/style')
slice = require('std/slice')
tags = require('tags')

div = tags('div')
img = tags('img')

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

function abs(left, top) {
	return style({ position:'absolute', top:top, left:left })
}

function graphic(w, h) {
	var content = slice(arguments, 2)
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

function logoIcon(size, top, postfix) {
	if (!postfix) { postfix = 'blank' }
	return div(style({ margin:top+'px auto 0', display:'inline-block', textAlign:'center', width:'100%' }),
		img({ src:'/graphics/identity/logoIcon-'+postfix+'-'+size+'x'+size+'.png' })
	)
}

function logoName(width, height, marginTop) {
	return div(
		style({ marginTop:marginTop, width:'100%', textAlign:'center' }),
		img({ src:'/graphics/identity/logoName-'+width+'x'+height+'.png' })
	)
}

$(function() {
	
	var iconGradientAmount = 70
	var spashGradientAmount = 50
	
	$('.sections').append(
		section('splashScreens', 'Splash Screens',
			graphic(320,480,
				div(brandGradient([160, 170], spashGradientAmount),
					logoIcon(128, 100),
					logoName(166, 72, 63)
				)
			),
			graphic(640,960,
				div(brandGradient([320, 330], spashGradientAmount),
					logoIcon(256, 200),
					logoName(332, 144, 130)
				)
			),
			graphic(640,1136,
				div(brandGradient([320, 330], spashGradientAmount),
					logoIcon(256, 200),
					logoName(332, 144, 130)
				)
			),
			
			div('title', 'App Store'),
			graphic(1024, 1024,
				div(brandGradient([512, 512], iconGradientAmount),
					logoIcon(512, 250, 'letter')
				)
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
