module.exports = {
	drawSpline:drawSpline
}

// t = tension
function drawSpline(ctx,pts,t){
	ctx.lineWidth=4;
	ctx.save();
	var cp=[];   // array of control points, as x0,y0,x1,y1,...
	var n=pts.length;

	// Draw an open curve, not connected at the ends
	for(var i=0;i<n-4;i+=2){
		cp=cp.concat(getControlPoints(pts[i],pts[i+1],pts[i+2],pts[i+3],pts[i+4],pts[i+5],t));
	}    
	for(var i=2;i<pts.length-5;i+=2){
		// var color=HSVtoRGB(Math.floor(240*(i-2)/(n-2)),0.8,0.8);
		// ctx.strokeStyle=hexToCanvasColor(color,0.75);       
		ctx.beginPath();
		ctx.moveTo(pts[i],pts[i+1]);
		ctx.bezierCurveTo(cp[2*i-2],cp[2*i-1],cp[2*i],cp[2*i+1],pts[i+2],pts[i+3]);
		ctx.stroke();
		ctx.closePath();
	}
	//  For open curves the first and last arcs are simple quadratics.
	// var color=HSVtoRGB(40,0.4,0.4);  // brown
	// ctx.strokeStyle=hexToCanvasColor(color,0.75); 
	ctx.beginPath();
	ctx.moveTo(pts[0],pts[1]);
	ctx.quadraticCurveTo(cp[0],cp[1],pts[2],pts[3]);
	ctx.stroke();
	ctx.closePath();

	// var color=HSVtoRGB(240,0.8,0.8); // indigo
	// ctx.strokeStyle=hexToCanvasColor(color,0.75); 
	ctx.beginPath();
	ctx.moveTo(pts[n-2],pts[n-1]);
	ctx.quadraticCurveTo(cp[2*n-10],cp[2*n-9],pts[n-4],pts[n-3]);
	ctx.stroke();
	ctx.closePath();
}

function getControlPoints(x0,y0,x1,y1,x2,y2,t){
    //  x0,y0,x1,y1 are the coordinates of the end (knot) pts of this segment
    //  x2,y2 is the next knot -- not connected here but needed to calculate p2
    //  p1 is the control point calculated here, from x1 back toward x0.
    //  p2 is the next control point, calculated here and returned to become the 
    //  next segment's p1.
    //  t is the 'tension' which controls how far the control points spread.
    
    //  Scaling factors: distances from this knot to the previous and following knots.
    var d01=Math.sqrt(Math.pow(x1-x0,2)+Math.pow(y1-y0,2));
    var d12=Math.sqrt(Math.pow(x2-x1,2)+Math.pow(y2-y1,2));
   
    var fa=t*d01/(d01+d12);
    var fb=t-fa;
  
    var p1x=x1+fa*(x0-x2);
    var p1y=y1+fa*(y0-y2);

    var p2x=x1-fb*(x0-x2);
    var p2y=y1-fb*(y0-y2);  
    
    return [p1x,p1y,p2x,p2y]
}
