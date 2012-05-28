var pens = module.exports

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

var collectPointsPen = create(basePen, {
	handleDown:function(point) {
		this.points = [point]
		this.down(point, this.points, this.ctx)
	},
	handleMove:function(point) {
		if (!this.points) { return }
		this.points.push(point)
		this.move(point, this.points, this.ctx)
	},
	handleUp:function(point) {
		this.points.push(point)
		this.up(point, this.points, this.ctx)
		this.points = null
	}
})

var initPen = function(opts) {
	this.colorPicker = opts.colorPicker
	this.ctx = opts.ctx
}

pens.smooth = proto(collectPointsPen, initPen, {
	down: function(point, points, ctx) {
		ctx.moveTo(point.x, point.y)
		ctx.beginPath()
		ctx.lineWidth = 5
		ctx.strokeStyle = this.rgba()
		ctx.globalCompositeOperation = 'source-over'
	},
	move: function(point, points, ctx) {
		if (points.length > 2) {
			var pN2 = points[points.length - 3]
			var pN1 = points[points.length - 2]
			var interp = { x:(pN2.x + pN1.x)/2, y:(pN2.y + pN1.y)/2 }
			ctx.quadraticCurveTo(pN2.x, pN2.y, interp.x, interp.y)
			ctx.stroke()
		}
	},
	up: function(point, points, ctx) {
		if (points.length == 2) {
			// dot
			ctx.fillStyle = ctx.strokeStyle
			ctx.arc(points[0].x, points[0].y, 5, 0, Math.PI*2, true)
			ctx.closePath()
			ctx.fill()
		} else if (points.length > 2) {
			var pN0 = points[points.length - 1]
			var pN1 = points[points.length - 2]
			ctx.quadraticCurveTo(pN0.x, pN0.y, pN1.x, pN1.y)
			ctx.stroke()
		}
	}
})


pens.zebra = proto(collectPointsPen, initPen, {
	down: function(point, points, ctx) {
		ctx.moveTo(point.x, point.y)
		ctx.strokeStyle = this.rgba()
		ctx.lineWidth = 10
		ctx.globalCompositeOperation = 'source-over'
	},
	move: function(point, points, ctx) {
		ctx.beginPath()
		var dw = 10
		ctx.lineWidth += Math.round((Math.random() * dw) - (dw/2 + .3))
		if (ctx.lineWidth < 1) ctx.lineWidth = 1
		if (ctx.lineWidth > 50) ctx.lineWidth = 50
		if (points.length > 2) {
			var pN2 = points[points.length - 3]
			var pN1 = points[points.length - 2]
			var interp = { x:(pN2.x + pN1.x)/2, y:(pN2.y + pN1.y)/2 }
			ctx.quadraticCurveTo(pN2.x, pN2.y, interp.x, interp.y)
			ctx.stroke()
		}
	},
	up: function(point, points, ctx) {
		if (points && points.length > 1) {
			var pN0 = points[points.length - 1]
			var pN1 = points[points.length - 2]
			ctx.quadraticCurveTo(pN0.x, pN0.y, pN1.x, pN1.y)
		}
	}
})

pens.glow = proto(collectPointsPen, initPen, {
	down: function(point, points, ctx) {
		ctx.moveTo(point.x, point.y)
		ctx.beginPath()
		ctx.lineWidth = 10
		ctx.strokeStyle = this.rgba(.01)
		ctx.globalCompositeOperation = 'darker'
	},
	move: function(point, points, ctx) {
		if (points.length > 2) {
			var pN2 = points[points.length - 3]
			var pN1 = points[points.length - 2]
			var interp = { x:(pN2.x + pN1.x)/2, y:(pN2.y + pN1.y)/2 }
			ctx.quadraticCurveTo(pN2.x, pN2.y, interp.x, interp.y)
			ctx.stroke()
		}
	},
	up: function(point, points, ctx) {
		if (points && points.length > 1) {
			// curve through the last two points
			var pN0 = points[points.length - 1]
			var pN1 = points[points.length - 2]
			ctx.quadraticCurveTo(pN0.x, pN0.y, pN1.x, pN1.y)
		}
	}
})

// var lineWidth = this.lineWidth
// var dw = lineWidth.vary
// ctx.lineWidth += Math.round((Math.random() * dw) - (dw/2 + .3))
// ctx.strokeStyle = rgba()
// if (ctx.lineWidth < lineWidth.min) {
// 	ctx.lineWidth = lineWidth.min
// } else if (ctx.lineWidth > lineWidth.max) {
// 	ctx.lineWidth = lineWidth.max
// }
// lineWidth: {
// 	init:5,
// 	vary:3,
// 	max:7,
// 	min:1
// }


function ribbon( context ) {
	this.init( context );
}

ribbon.prototype = {
	context: null,
	mouseX: null, mouseY: null,
	painters: null,
	interval: null,

	init: function( context ) {
		var scope = this;
		
		this.context = context;
		this.context.globalCompositeOperation = 'source-over';

		this.mouseX = SCREEN_WIDTH / 2;
		this.mouseY = SCREEN_HEIGHT / 2;

		this.painters = new Array();
		
		for (var i = 0; i < 50; i++) {
			this.painters.push({
				dx: SCREEN_WIDTH / 2,
				dy: SCREEN_HEIGHT / 2,
				ax: 0,
				ay: 0,
				div: 0.1,
				ease: Math.random() * 0.2 + 0.6 
			});
		}
		
		this.interval = setInterval( update, 1000/60 );
		
		function update() {
			var i;
			
			this.context.lineWidth = BRUSH_SIZE;			
			this.context.strokeStyle = "rgba(" + COLOR[0] + ", " + COLOR[1] + ", " + COLOR[2] + ", " + 0.05 * BRUSH_PRESSURE + ")";
			
			for (i = 0; i < scope.painters.length; i++) {
				scope.context.beginPath();
				scope.context.moveTo(scope.painters[i].dx, scope.painters[i].dy);		
				
				scope.painters[i].dx -= scope.painters[i].ax = (scope.painters[i].ax + (scope.painters[i].dx - scope.mouseX) * scope.painters[i].div) * scope.painters[i].ease;
				scope.painters[i].dy -= scope.painters[i].ay = (scope.painters[i].ay + (scope.painters[i].dy - scope.mouseY) * scope.painters[i].div) * scope.painters[i].ease;
				
				scope.context.lineTo(scope.painters[i].dx, scope.painters[i].dy);
				scope.context.stroke();
			}
		}
	},
	
	strokeStart: function( mouseX, mouseY ) {
		this.mouseX = mouseX;
		this.mouseY = mouseY

		for (var i = 0; i < this.painters.length; i++) {
			this.painters[i].dx = mouseX;
			this.painters[i].dy = mouseY;
		}

		this.shouldDraw = true;
	},

	stroke: function( mouseX, mouseY ) {
		this.mouseX = mouseX;
		this.mouseY = mouseY;
	},

	strokeEnd: function() {
		clearInterval(this.interval)
	}
}
