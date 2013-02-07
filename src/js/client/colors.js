var rand = require('std/rand')

var blues = [[71,125,197],[0,141,216],[0,169,237]]
var teals = [[0,200,232],[61,222,224],[0,205,150]]
var greens = [[0,195,47],[54,206,18],[120,203,0]]
var yellows = [[189,238,0],[233,239,0],[247,217,0]]
var oranges = [[255,162,0],[255,124,0],[219,84,0]]
var reds = [[173,73,45],[205,35,0],[255,106,218]]
var purples = [[200,132,213],[151,108,221],[88,88,197]]
var colors = blues.concat(teals).concat(greens).concat(yellows).concat(oranges).concat(reds).concat(purples)

module.exports = colors

colors.blues = blues
colors.teals = teals
colors.greens = greens
colors.yellows = yellows
colors.oranges = oranges
colors.reds = reds
colors.purples = purples

colors.series = series
colors.rgb = rgb
colors.rgba = rgba
colors.hsvToRgb = hsvToRgb
colors.hslToRgb = hslToRgb
colors.rgbToHsv = rgbToHsv
colors.rgbToHsl = rgbToHsl


function series() {
	var colorIndex = rand(0, colors.length)
	return function next() {
		colorIndex = (colorIndex + 1) % colors.length
		return colors[colorIndex]
	}
}

function getColors() {
	colors.blues = blues
	colors.purples = purples
	colors.greens = greens
	colors.oranges = oranges
	return colors
}

rgb.string = function() { return 'rgb('+this[0]+','+this[1]+','+this[2]+')'}
function rgb(color) {
	color.toString = rgb.string
	return color
}

rgba.string = function() { return 'rgba('+this[0]+','+this[1]+','+this[2]+','+this[3]+')'}
function rgba(color, alpha) {
	if (alpha != undefined) { color[3] = alpha }
	color.toString = rgba.string
	return color
}

// http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript
/**
 * Converts an HSV color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
 * Assumes h, s, and v are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 */
function hsvToRgb(hsv){
	var h = hsv[0], s = hsv[1], v = hsv[2]
	var r, g, b;

	var i = Math.floor(h * 6);
	var f = h * 6 - i;
	var p = v * (1 - s);
	var q = v * (1 - f * s);
	var t = v * (1 - (1 - f) * s);

	switch(i % 6){
		case 0: r = v, g = t, b = p; break;
		case 1: r = q, g = v, b = p; break;
		case 2: r = p, g = v, b = t; break;
		case 3: r = p, g = q, b = v; break;
		case 4: r = t, g = p, b = v; break;
		case 5: r = v, g = p, b = q; break;
	}

	return [r * 255, g * 255, b * 255];
}

/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 */
function hslToRgb(hsl){
	var h = hsl[0], s = hsl[1], l = hsl[2]
    var r, g, b;

    if(s == 0){
        r = g = b = l; // achromatic
    }else{
        function hue2rgb(p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [r * 255, g * 255, b * 255];
}

/**
 * Converts an RGB color value to HSL. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes r, g, and b are contained in the set [0, 255] and
 * returns h, s, and l in the set [0, 1].
 */
function rgbToHsl(rgb){
	var r = rgb[0]/255, g = rgb[1]/255, b = rgb[2]/255;
	var max = Math.max(r, g, b), min = Math.min(r, g, b);
	var h, s, l = (max + min) / 2;

	if(max == min){
		h = s = 0; // achromatic
	}else{
		var d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch(max){
			case r: h = (g - b) / d + (g < b ? 6 : 0); break;
			case g: h = (b - r) / d + 2; break;
			case b: h = (r - g) / d + 4; break;
		}
		h /= 6;
	}

	return [h, s, l];
}


// http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript
/**
 * Converts an RGB color value to HSV. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
 * Assumes r, g, and b are contained in the set [0, 255] and
 * returns h, s, and v in the set [0, 1].
 */
function rgbToHsv(rgb){
	var r = rgb[0]/255, g = rgb[1]/255, b = rgb[2]/255;
	var max = Math.max(r, g, b), min = Math.min(r, g, b);
	var h, s, v = max;

	var d = max - min;
	s = max == 0 ? 0 : d / max;

	if(max == min){
		h = 0; // achromatic
	}else{
		switch(max){
			case r: h = (g - b) / d + (g < b ? 6 : 0); break;
			case g: h = (b - r) / d + 2; break;
			case b: h = (r - g) / d + 4; break;
		}
		h /= 6;
	}

	return [h, s, v];
}
