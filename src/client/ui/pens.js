var basePen = {
	rgba: function(alpha) {
		return this.colorPicker.getColor()
		// var colors = []
		// for(var i = 0; i< 3; i++) {
		// 	colors.push(Math.floor(Math.random() * 255))
		// }
		// if (alpha) {
		// 	colors.push(alpha)
		// 	return 'rgba('+colors.join(',')+')'
		// } else {
		// 	return 'rgb('+colors.join(',')+')'
		// }
	}
}

var initPen = function(opts) {
	this.colorPicker = opts.colorPicker
}

var pens = module.exports

pens.smooth = proto(basePen, initPen, {
	onDown: function(ctx, point) {
		ctx.moveTo(point.x, point.y)
		ctx.beginPath()
		ctx.lineWidth = this.lineWidth.init
		ctx.fillStyle = ctx.strokeStyle = this.rgba()
		ctx.globalCompositeOperation = 'source-over'
		this.points = [point]
	},
	onMove: function(ctx, point) {
		var points = this.points
		if (!points) { return }
		var lineWidth = this.lineWidth
		var dw = lineWidth.vary
		// ctx.lineWidth += Math.round((Math.random() * dw) - (dw/2 + .3))
		// ctx.strokeStyle = rgba()
		// if (ctx.lineWidth < lineWidth.min) {
		// 	ctx.lineWidth = lineWidth.min
		// } else if (ctx.lineWidth > lineWidth.max) {
		// 	ctx.lineWidth = lineWidth.max
		// }
		points.push(point)
		
		if (points.length > 2) {
			var pN2 = points[points.length - 3]
			var pN1 = points[points.length - 2]
			var interp = { x:(pN2.x + pN1.x)/2, y:(pN2.y + pN1.y)/2 }
			ctx.quadraticCurveTo(pN2.x, pN2.y, interp.x, interp.y)
			ctx.stroke()
		}
	},
	onUp: function(ctx, point) {
		var points = this.points
		points.push(point)
		if (points.length == 2) {
			ctx.arc(points[0].x, points[0].y, 5, 0, Math.PI*2, true)
			ctx.closePath()
			ctx.fill()
		} else if (points.length > 2) {
			// curve through the last two points
			var pN0 = points[points.length - 1]
			var pN1 = points[points.length - 2]
			ctx.quadraticCurveTo(pN0.x, pN0.y, pN1.x, pN1.y)
			ctx.stroke()
		}
		this.points = null
	},
	lineWidth: {
		init:5,
		vary:3,
		max:7,
		min:1
	}
})


pens.zebra = proto(basePen, function(){}, {
	onDown: function(ctx, point) {
		this.points = [point]
		ctx.moveTo(point.x, point.y)
		ctx.strokeStyle = this.rgba()
		ctx.lineWidth = this.lineWidth.init
		ctx.globalCompositeOperation = 'source-over'
	},
	onMove: function(ctx, point) {
		var points = this.points
		if (!points) { return }
		points.push(point)
		var dw = 10
		ctx.beginPath()
		// ctx.lineWidth += Math.round((Math.random() * dw) - (dw/2 + .3))
		// if (ctx.lineWidth < 1) ctx.lineWidth = 1
		// if (ctx.lineWidth > 50) ctx.lineWidth = 50
		if (points.length > 2) {
			var pN2 = points[points.length - 3]
			var pN1 = points[points.length - 2]
			var interp = { x:(pN2.x + pN1.x)/2, y:(pN2.y + pN1.y)/2 }
			ctx.quadraticCurveTo(pN2.x, pN2.y, interp.x, interp.y)
			ctx.stroke()
		}
	},
	onUp: function(ctx, point) {
		var points = this.points
		if (!points) { return }
		points.push(point)
		if (points && points.length > 1) {
			// curve through the last two points
			var pN0 = points[points.length - 1]
			var pN1 = points[points.length - 2]
			ctx.quadraticCurveTo(pN0.x, pN0.y, pN1.x, pN1.y)
		}
		this.points = null
	}
})

pens.glow = proto(basePen, function(){}, {
	onDown: function(ctx, point) {
		ctx.moveTo(point.x, point.y)
		ctx.beginPath()
		ctx.lineWidth = this.lineWidth.init
		ctx.strokeStyle = this.rgba(.1)
		ctx.globalCompositeOperation = 'lighter'
		this.points = [point]
	},
	onMove: function(ctx, point) {
		var points = this.points
		if (!points) { return }
		// var lineWidth = this.lineWidth
		// var dw = lineWidth.vary
		// ctx.lineWidth += Math.round((Math.random() * dw) - (dw/2 + .3))
		// if (ctx.lineWidth < lineWidth.min) {
		// 	ctx.lineWidth = lineWidth.min
		// } else if (ctx.lineWidth > lineWidth.max) {
		// 	ctx.lineWidth = lineWidth.max
		// }
		points.push(point)
		
		if (points.length > 2) {
			var pN2 = points[points.length - 3]
			var pN1 = points[points.length - 2]
			var interp = { x:(pN2.x + pN1.x)/2, y:(pN2.y + pN1.y)/2 }
			ctx.quadraticCurveTo(pN2.x, pN2.y, interp.x, interp.y)
			ctx.stroke()
		}
	},
	onUp: function(ctx, point) {
		var points = this.points
		points.push(point)
		if (points && points.length > 1) {
			// curve through the last two points
			var pN0 = points[points.length - 1]
			var pN1 = points[points.length - 2]
			ctx.quadraticCurveTo(pN0.x, pN0.y, pN1.x, pN1.y)
		}
		this.points = null
	},
	lineWidth: {
		init:10,
		vary:5,
		max:20,
		min:3
	}
})

// pens.ribbon = proto(basePen, function(){}, {
// 	onDown: function(ctx, point) {
// 		state.brushColor = "rgba(255,255,255,0.8)"//rgba(.3)
// 		state.ribbonBrush = new ribbon(ctx)
// 		state.ribbonBrush.strokeStart(point.x, point.y)
// 	},
// 	onMove: function(ctx, point) {
// 		if (!state.ribbonBrush) { return }
// 		state.ribbonBrush.stroke(point.x, point.y);
// 	},
// 	onUp: function(ctx, point) {
// 		state.ribbonBrush.destroy();
// 	}
// })

// function ribbon( context ) { this.init( context ) }
// 
// ribbon.prototype = {
//     context: null,
//     mouseX: null,
//     mouseY: null,
//     painters: null,
//     interval: null,
//     init: function( context ) {
//         var scope = this;
//         this.context = context;
//         // this.context.globalCompositeOperation = 'source-over';
//         this.mouseX = SCREEN_WIDTH / 2;
//         this.mouseY = SCREEN_HEIGHT / 2;
//         this.painters = new Array();
//         for (var i = 0; i < 50; i++) {
//             this.painters.push({ dx: SCREEN_WIDTH / 2, dy: SCREEN_HEIGHT / 2, ax: 0, ay: 0, div: 0.1, ease: Math.random() * 0.1 + 0.5});
//         }
//         this.interval = setInterval( bind(this, update), 1000/30 );
//         function update()
//         {
//             var i;
//             this.context.lineWidth = BRUSH_SIZE;            
//             this.context.strokeStyle = state.brushColor//rgba()//"rgba(" + COLOR[0] + ", " + COLOR[1] + ", " + COLOR[2] + ", " + 0.05 * BRUSH_PRESSURE + ")";
//             for (i = 0; i < scope.painters.length; i++)
//             {
//                 scope.context.beginPath();
//                 scope.context.moveTo(scope.painters[i].dx, scope.painters[i].dy);        
//                 scope.painters[i].dx -= scope.painters[i].ax = (scope.painters[i].ax + (scope.painters[i].dx - scope.mouseX) * scope.painters[i].div) * scope.painters[i].ease;
//                 scope.painters[i].dy -= scope.painters[i].ay = (scope.painters[i].ay + (scope.painters[i].dy - scope.mouseY) * scope.painters[i].div) * scope.painters[i].ease;
//                 scope.context.lineTo(scope.painters[i].dx, scope.painters[i].dy);
//                 scope.context.stroke();
//             }
//         }
//     },
//     destroy: function() {
//         clearInterval(this.interval);
//     },
//     strokeStart: function( mouseX, mouseY ) {
//         this.mouseX = mouseX
//         this.mouseY = mouseY
//         for (var i = 0; i < this.painters.length; i++) {
//             this.painters[i].dx = mouseX;
//             this.painters[i].dy = mouseY;
//         }
//     },
//     stroke: function( mouseX, mouseY ) {
//         this.mouseX = mouseX;
//         this.mouseY = mouseY;
//     }
// }