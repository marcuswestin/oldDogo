
;(function(global) {
	function DrawContext(canvas, width, height) {
		this.canvas = canvas
		this.ctx = canvas.getContext('2d')
		this.w = width
		this.h = height
	}
	DrawContext.prototype = {
		moveTo:function(p) { this.ctx.moveTo(p[0], p[1]); return this },
		lineTo:function(p) { this.ctx.lineTo(p[0], p[1]); return this },
		stroke:function() { this.ctx.stroke(); return this },
		fill:function() { this.ctx.fill(); return this },
		beginPath:function() { this.ctx.beginPath(); return this },
		closePath:function() { this.ctx.closePath(); return this },
		arc:function(p,r,angle,clockwise) { this.ctx.arc(p[0], p[1], r, angle[0], angle[1], clockwise); return this },
		strokeStyle:function(strokeStyle) { this.ctx.strokeStyle = strokeStyle; return this },
		fillStyle:function(fillStyle) { this.ctx.fillStyle = fillStyle; return this },
		scale:function(d) { this.ctx.scale(d[0], d[1]); return this },
		fillRect:function(p,d) { this.ctx.fillRect(p[0], p[1], d[0], d[1]); return this },
		rotate:function(rad) { this.ctx.rotate(rad); return this },
		translate:function(d) { this.ctx.translate(d[0],d[1]); return this },
		drawImage:function(img, p, d) { this.ctx.drawImage(img, p[0], p[1], d[0], d[1]); return this },
		translate:function(p) { this.ctx.translate(p[0], p[1]); return this },
		
		globalCompositeOperation:function(operation) { this.ctx.globalCompositeOperation = operation; return this },
		quadraticCurveTo:function(p1, p2) { this.ctx.quadraticCurveTo(p1[0], p1[1], p2[0], p2[1]); return this },
		lineWidth:function(lineWidth) { this.ctx.lineWidth = lineWidth; return this },
		
		save:function() { this.ctx.save(); return this },
		restore:function() { this.ctx.restore(); return this },
		
		line:function(p1,p2) { return this.moveTo(p1).lineTo(p2) },
		dot:function(p,r) { return this.arc(p, r, [0, Math.PI*2], true) },
		style:function(style) { return this.strokeStyle(style).fillStyle(style) },
		background:function(color) { return this.fillStyle(color).fillRect([0, 0], [this.w, this.h]) },
	}
	
	function draw(d) {
		var width = d[0]
		var height = d[1]
		var canvas = document.createElement('canvas')
		var scale = window.devicePixelRatio || 1
		canvas.setAttribute('width', width)
		canvas.setAttribute('height', height)
		canvas.style.width = width
		canvas.style.height = height
		return new DrawContext(canvas, width, height)
	}
	
	if (typeof module == 'undefined') { global.draw = draw }
	else { module.exports = draw }
})(this);
