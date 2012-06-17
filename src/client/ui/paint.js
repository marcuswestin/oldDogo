;(function(global) {
	
	function PaintContext(dim) {
		this.ratio = window.devicePixelRatio || 1
		this.dim = dim
		this.el = this.create('div', true)
		this.bg = this.addCanvas(this.el)
		this.fg = this.addCanvas(this.el)
		this.buf = this.el.appendChild(this.create('div'))
		this.filter = this.addCanvas(this.el)
		this.frame = this.addCanvas(this.el)
	}
	
	PaintContext.prototype = {
		/* Regular canvas functions
		 **************************/
		moveTo:ctxFunction(function(ctx, p) { ctx.moveTo(p[0], p[1]) }),
		lineTo:ctxFunction(function(ctx, p) { ctx.lineTo(p[0], p[1]) }),
		stroke:ctxFunction(function(ctx) { ctx.stroke() }),
		fill:ctxFunction(function(ctx) { ctx.fill() }),
		beginPath:ctxFunction(function(ctx) { ctx.beginPath() }),
		closePath:ctxFunction(function(ctx) { ctx.closePath() }),
		arc:ctxFunction(function(ctx, p,r,angle,clockwise) { ctx.arc(p[0], p[1], r, angle[0], angle[1], clockwise) }),
		strokeStyle:ctxFunction(function(ctx, strokeStyle) { ctx.strokeStyle = strokeStyle }),
		fillStyle:ctxFunction(function(ctx, fillStyle) { ctx.fillStyle = fillStyle }),
		scale:ctxFunction(function(ctx, d) { ctx.scale(d[0], d[1]) }),
		fillRect:ctxFunction(function(ctx, p,d) { ctx.fillRect(p[0], p[1], d[0], d[1]) }),
		rotate:ctxFunction(function(ctx, rad) { ctx.rotate(rad) }),
		translate:ctxFunction(function(ctx, d) { ctx.translate(d[0],d[1]) }),
		translate:ctxFunction(function(ctx, p) { ctx.translate(p[0], p[1]) }),
		globalCompositeOperation:ctxFunction(function(ctx, operation) { ctx.globalCompositeOperation = operation }),
		quadraticCurveTo:ctxFunction(function(ctx, p1, p2) { ctx.quadraticCurveTo(p1[0], p1[1], p2[0], p2[1]) }),
		lineWidth:ctxFunction(function(ctx, lineWidth) { ctx.lineWidth = lineWidth }),
		save:ctxFunction(function(ctx) { ctx.save() }),
		restore:ctxFunction(function(ctx) { ctx.restore() }),
		drawImage:ctxFunction(function(ctx, img, p, d) {
			var args = [is2dContext(img) ? img.canvas : img]
			if (!p) { args = args.concat([0, 0]) } // default to origin
			if (d) { args = args.concat([d[0], d[1]]) } // drawImage doesn't like undefined width/height arguments
			ctx.drawImage.apply(ctx, args)
		}),
		
		/* Drawing conveniences
		 **********************/
		line:ctxFunction(function(ctx, p1, p2) { return this.moveTo(ctx, p1).lineTo(ctx, p2) }),
		dot:ctxFunction(function(ctx, p, r) { return this.arc(ctx, p, r, [0, Math.PI*2], true) }),
		style:ctxFunction(function(ctx, style) { return this.strokeStyle(ctx, style).fillStyle(ctx, style) }),
		fillAll:ctxFunction(function(ctx, color) { return this.fillStyle(ctx, color).fillRect(ctx, [0, 0], [this.dim[0], this.dim[1]]) }),
		
		/* Layer selections
		 ******************/
		withBackground:function(fn) { return this.withLayer(this.bg, fn) },
		withLayer:function(layer, fn) {
			this.currentLayer = layer
			fn.call(this, this)
			this.currentLayer = null
			return this
		},
		snapshot:function() {
			var snap = this.create('canvas').getContext('2d')
			this.drawImage(snap, this.bg)
			this.drawImage(snap, this.fg)
			var buf = this.buf.children
			for (var i=0; i<buf; i++) {
				this.drawImage(snap, buf[i])
			}
			this.drawImage(snap, this.filter)
			this.drawImage(snap, this.frame)
			return snap.canvas
		},
		
		/* Buffer/Undo
		 *************/
		pushLayer: function() {
			this.addCanvas(this.buf)
			return this
		},
		popLayer: function() {
			var layer = this.buf.lastChild
			if (layer) { this.buf.removeChild(layer) }
			return this
		},
		flattenLayer: function() {
			var layer = this.buf.firstChild
			if (!layer) { return this }
			this.buf.removeChild(layer)
			return this.drawImage(this.fg, layer)
		},
		flattenAll: function() {
			while (this.buf.firstChild) { this.flattenLayer() }
			return this
		},
		
		/* DOM utils
		 ***********/
		create:function(tag, relative) {
			var el = document.createElement(tag)
			var ratio = this.ratio
			var dim = this.dim
			el.setAttribute('width', dim[0] * ratio)
			el.setAttribute('height', dim[1] * ratio)
			el.style.width = dim[0]+'px'
			el.style.height = dim[1]+'px'
			el.style.position = relative ? 'relative' : 'absolute'
			return el
		},
		addCanvas:function(el) {
			var ctx = el.appendChild(this.create('canvas')).getContext('2d')
			this.scale(ctx, [this.ratio, this.ratio])
			return ctx
		},
		toTag:function() {
			return this.el
		}
	}

	function ctxFunction(fn) {
		return function() {
			var args = Array.prototype.slice.call(arguments, 0)
			if (!is2dContext(args[0])) {
				var topLayer = this.buf.lastChild
				args.unshift(this.currentLayer || (topLayer ? topLayer.getContext('2d') : this.fg))
			}
			var res = fn.apply(this, args)
			return res || this
		}
	}

	function is2dContext(obj) {
		return ({}).toString.call(obj) == '[object CanvasRenderingContext2D]'
	}

	function paint(dim) { return new PaintContext(dim) }

	if (typeof module == 'undefined') { global.paint = paint }
	else { module.exports = paint }
})(this);

