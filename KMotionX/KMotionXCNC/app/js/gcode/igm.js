///<reference path="../../typings/igm.d.ts" />
// Intermediate Gcode Model
'use strict'
var KMX = KMX || {};
KMX.IGM = function IGM(){
  this.layers = {}; // sort by stroke color
  this.layerKeys = []; // layerKey is a mapping to add unnamed layers, layer will get a generated name
  this.textLayer = []; // textpaths
  this.unsupported = [],  // Unsupported nodes
  this.addToLayerObject = addToLayerObject;
  this.applyModifications = applyModifications;
  this.getMaxBounds = getMaxBounds;
  
  function addToLayerObject(layerKey, obj, layerName){
    if(layerName === undefined){
      layerName = this.layerKeys[layerKey]; 
      if(layerName === undefined){
        var layerNumber = 0;//this.layerKeys.length;
        do{
          layerNumber++;
          layerName =  'layer' + layerNumber;
          
        } while(this.layers[layerName] !== undefined)
      }
    }
    //TODO check for renaming layers
    this.layerKeys[layerKey] = layerName; 
    this.layers[layerName] = this.layers[layerName] || []; 
    this.layers[layerName].push(obj);

  }
  Object.defineProperty(this, 'alllayers', {
    get: function() {
        var all = [];
        for (var prop in this.layers) {
          // important check that this is objects own property 
          // not from prototype prop inherited
          if(this.layers.hasOwnProperty(prop)){
            console.log('layerName', prop);
            all = all.concat(this.layers[prop]);
          }
        }
        return all;
    }
  });
  
  
  function applyModifications(settings, ratio){
      //cannot use this default value syntax for booleans
      settings.translateToOrigo = angular.isBoolean(settings.translateToOrigo) ? settings.translateToOrigo: true;
      settings.removeOutline = angular.isBoolean(settings.removeOutline) ? settings.removeOutline: false;
      settings.removeDuplicates = angular.isBoolean(settings.removeDuplicates) ? settings.removeDuplicates: true;
      settings.removeSingularites = angular.isBoolean(settings.removeSingularites) ?  settings.removeSingularites: true;

      var paths = this.alllayers;
      console.info("Nr of Shapes: ", paths.length);
      
      scaleVectors(paths, ratio);
      
      //Bounds are needed by removeDuplicates
      setBounds(paths);
      
      if(settings.removeSingularites){
        removeSingularites(paths);
      }
      
      // cut the inside parts first
      if(settings.removeDuplicates){
        //This function will change the order of the paths
        removeDuplicates(paths);
      }
    
      
      orderNearestNeighbour(paths);
      joinAdjacent(paths,settings.fractionalDigits);
      setBounds(paths);
      
      var maxBounds = getMaxBounds(paths);
      
      if(settings.removeOutline){
        //Some files has an outline. remove it if requested
        removeOutline(paths, maxBounds);
      }
      
      var translateVec = settings.translateToOrigo ? new Vec2(-maxBounds.x,-maxBounds.y) : new Vec2(0,0);
      translateVectors(paths, translateVec);
      console.info("Nr of Shapes after: ", paths.length);

      return paths;

  }
  
  function translateVectors(paths, translateVec){
    var idx = paths.length;
    while(idx--) {
      var vectors = paths[idx]; 
      var subidx = vectors.length;
      while(subidx--) {
        var vec = vectors[subidx];
        vec.add(translateVec);
      }
    }   
  }  
  
  function scaleVectors(paths, ratio){
    var idx = paths.length;
    while(idx--) {
      var vectors = paths[idx]; 
      var subidx = vectors.length;
      while(subidx--) {
        var vec = vectors[subidx];
        //scale
        vec.scale(ratio);
        //transpose coordinates
        //vec.rotate(Math.PI/4);
      }
    }   
  }
  
  function setBounds(paths){
    var idx = paths.length;
    while(idx--) {
      var bounds = new BoundRect();
      var vectors = paths[idx];
      if(vectors === undefined){
        console.info("what", idx);
      }
      var subidx = vectors.length;
      while(subidx--) {
        var vec = vectors[subidx];
        bounds.include(vec);
      }
      vectors.bounds = bounds;
    }   
  }
  
  function getMaxBounds(paths){
    var maxBounds = new BoundRect();
    var idx = paths.length;
    while(idx--) {
      var vectors = paths[idx]; 
      maxBounds.include(vectors.bounds.vec1());
      maxBounds.include(vectors.bounds.vec2());
    }
    return maxBounds
  }
  
  function removeDuplicates(paths){
    
    paths.sort(function(a, b) {
      // sort by area
      var aArea = a.bounds.area(); //TODO area needs to count zero with as 1
      var bArea = b.bounds.area();
      var result = aArea-bArea;
      if(result == 0){
        var avec = a[0];
        var bvec = b[0];
        //TODO Experimental only, Need to compare whole path not just first point
        //and reverse path
        result = avec.x - bvec.x;
        if(result == 0){
          result = avec.y - bvec.y;
        }
      }
      return result;
    });
    
    var idx = paths.length;
    while(idx-- > 1) {
      //TODO Experimental only, Need to compare whole path not just start and end point
      var p1 = paths[idx];
      var p2 = paths[idx-1];
      if(p1.first().equal(p2.first()) && p1.last().equal(p2.last())){
        paths.splice(idx,1);
      }
    }
  }
  
  function removeSingularites(paths){
    var idx = paths.length;
    while(idx--) {
      if(paths[idx].length == 1){
        paths.splice(idx,1);
      };
    }
  }
  function removeOutline(paths, maxBounds){
    //TODO Find object with the same size as maxbounds.
    //currently this just asumes the largest object is first
    paths.pop();      
  }
  
  
  function joinAdjacent(paths,fractionalDigits){
    if(paths.length < 2){
      return;
    }
    var idx = 0;
    var last = paths[idx++];
    while(idx < paths.length){
      var next = paths[idx];
      var lastEnd =last[last.length-1];
      var nextStart = next[0];
      //console.info(lastEnd, nextStart);
      if(pointEquals(lastEnd, nextStart,fractionalDigits)){
        last.push.apply(last, next);
        paths.splice(idx,1);
      } else {
        last = next;
        idx++
      }
    }
  }
  function pointEquals(v1,v2,fractionalDigits){
    return (
        v1.x.toFixed(fractionalDigits) === v2.x.toFixed(fractionalDigits) &&
        v1.y.toFixed(fractionalDigits) === v2.y.toFixed(fractionalDigits)
    );
  }
  function orderNearestNeighbour(paths){
    
  //These are the steps of the algorithm:
  //
  //  start on an arbitrary vertex as current vertex.
  //  find out the shortest edge connecting current vertex and an unvisited vertex V.
  //  set current vertex to V.
  //  mark V as visited.
  //  if all the vertices in domain are visited, then terminate.
  //  Go to step 2.
    var orderedPaths = [];
    var next = nearest(new Vec2(0,0), paths);
    orderedPaths.push(next);
    while(paths.length > 0){
      next = nearest(next[next.length-1], paths);
      orderedPaths.push(next);      
    }
    
    paths.push.apply(paths, orderedPaths);
    return;
    
    function nearest(point, paths){
      
      var dist = Infinity;
      var index = -1;
      var checkReversePath = true;
      
      for (var pathIdx = 0, pathLength = paths.length; pathIdx < pathLength; pathIdx++) {
        var path = paths[pathIdx];
        var pathStartPoint = path[0];
        var distanceSquared;
        var startDS = pathStartPoint.distanceSquared(point);
        if(checkReversePath){
          //check endpoint as well and reverse path if endpoint is closer
          var pathEndPoint = path[path.length-1];
          var endDS = pathEndPoint.distanceSquared(point);
          if(startDS < endDS){
            distanceSquared = startDS;
          } else {
            distanceSquared = endDS;
            path.reverse();
          }
          
        } else {
          distanceSquared = startDS;
        }
        
        if(distanceSquared < dist){
          dist = distanceSquared;
          index = pathIdx;
        }
        
      }
      return paths.splice(index,1)[0];
    }
  }  
  
  
}



var Unit = {
    inch: "inch",
    mm: "mm"
}

var GCode ={};


GCode.Source = function (gcode){
  if(Array.isArray(gcode)){
    this.lines = gcode;
    this.text = gcode.join('\n');;
  } else {
    this.text = gcode;   
    this.lines = gcode.split('\n');;
  }
}

GCode.Curve3 = function ( startPoint, endPoint, args, clockWise ) {
  
  
  var centerX = startPoint.x + args.I;
  var centerY = startPoint.y + args.J;
  var centerZ = startPoint.z + args.K; // Helical not correct implemented yet, i guess...
  var startAngle;
  var endAngle;
  var radius = Math.sqrt((args.I * args.I) + (args.J * args.J));  //should use pythagoras
  if(startPoint.x == endPoint.x && startPoint.y == endPoint.y){
    //full circle
    startAngle = 0;
    endAngle = Math.PI*2;
  } else {
    startAngle = -Math.atan2(endPoint.y-centerY, endPoint.x-centerX);
    endAngle   = Math.atan2(args.J, args.I);
  }

  //console.info("Curve ax, ay, radius, startangle, endangle",aX, aY, radius,aStartAngle,  aEndAngle);
  
  this.init(
      centerX,  centerY,                  // ax, aY
      radius, radius,           // xRadius, yRadius
      startAngle,  endAngle,  // aStartAngle, aEndAngle
      clockWise                     // aClockwise
  );
  this.sZ = startPoint.z;
  this.height = endPoint.z - startPoint.z;  
  
}

GCode.Curve3.prototype.init = function ( aX, aY, xRadius, yRadius, aStartAngle, aEndAngle, aClockwise ) {
  //Kept this function since it is the same as the THREE.EllipseCurve
  this.aX = aX;
  this.aY = aY;

  this.xRadius = xRadius;
  this.yRadius = yRadius;

  this.aStartAngle = aStartAngle;
  this.aEndAngle = aEndAngle;

  this.aClockwise = aClockwise;

};

GCode.Curve3.prototype.getPoint = function ( t , h) {

  var deltaAngle = this.aEndAngle - this.aStartAngle;

  if ( deltaAngle < 0 ) deltaAngle += Math.PI * 2;
  if ( deltaAngle > Math.PI * 2 ) deltaAngle -= Math.PI * 2;

  var angle;

  if ( this.aClockwise === true ) {

      angle = this.aEndAngle + ( 1 - t ) * ( Math.PI * 2 - deltaAngle );

  } else {

      angle = this.aStartAngle + t * deltaAngle;

  }
  
  var vector = new THREE.Vector3();

  vector.x = this.aX + this.xRadius * Math.cos( angle );
  vector.y = this.aY + this.yRadius * Math.sin( angle );
  vector.z = this.sZ + h;
  return vector;

};  



GCode.Curve3.prototype.getPoints = function ( divisions ) {

  if ( ! divisions ) divisions = 5;

  var d, pts = [];
  
  var h = 0;
  var hdelta = this.height / (divisions + 1);
  
  for ( d = 0; d <= divisions; d ++ ) { 
      pts.push( this.getPoint( d / divisions, h ) );
      h+=hdelta;
  }
  //console.info("ARC height sz ez delta",this.height, this.sZ, h-hdelta, hdelta);
  return pts;

};



function BoundRect(){
  this.x = Infinity;
  this.y = Infinity;
  this.x2 = -Infinity;
  this.y2 = -Infinity
  
  this.area = area;
  this.height = height;
  this.width = width;
  this.include = include;
  this.scale = scale;
  this.vec1 = vec1;
  this.vec2 = vec2;
  
  function scale(ratio){
    this.x = this.x*ratio;
    this.y = this.y*ratio;
    this.x2 = this.x2*ratio;
    this.y2 = this.y2*ratio;
    return this;      
  }
  
  function vec1(){
    return new Vec2(this.x,this.y);
  }
  function vec2(){
    return new Vec2(this.x2,this.y2);
  }
  
  function include(vec){
    var x = vec.x;
    var y = vec.y;
    
    if (x < this.x) {
      this.x = x;
    }

    if (y < this.y) {
      this.y = y;
    }

    if (x > this.x2) {
      this.x2 = x;
    }
    if (y > this.y2) {
      this.y2 = y;
    }
  }
  
  function area(){
    return this.height() * this.width();
  }
  
  function height(){
    var height = this.y2-this.y;
    return height;
  }
  
  function width(){
    var width = this.x2-this.x;      
    return width;
  }
      
}




// ### Common / Math / Vec2

// A 2D column vector
function Vec2(x, y) {
  if (x) {
    this.x = x;
  }

  if (y) {
    this.y = y;
  }
};

Vec2.prototype = {
  x : 0,
  y : 0,

  // set x and y
  // TODO: mark as dirty for other calculations
  set : function(x, y) {
    this.x = x;
    this.y = y;
    return this;
  },

  // reset x and y to zero
  // TODO: mark as dirty for other calcs
  zero : function() {
    this.x = 0;
    this.y = 0;
    return this;
  },

  // negate the values of this vector and return a new Vec2
  negate : function(returnNew) {
    if (returnNew) {
      return new Vec2(-this.x, -this.y);
    } else {
      this.x = -this.x;
      this.y = -this.y;
      return this;
    }
  },

  // Add the incoming `vec2` vector to this vector
  // TODO: mark dirty for other calcs
  add : function(vec2, returnNew) {
    if (!returnNew) {
      this.x += vec2.x;
      this.y += vec2.y;
      return this;
    } else {
      // Return a new vector if `returnNew` is truthy
      return new Vec2(
        this.x + vec2.x,
        this.y + vec2.y
      );
    }
  },

  // Subtract the incoming `vec2` from this vector
  // TODO: mark dirty for other calcs
  subtract : function(vec2, returnNew) {
    if (!returnNew) {
      this.x -= vec2.x;
      this.y -= vec2.y;
      return this;
    } else {
      // Return a new vector if `returnNew` is truthy
      return new Vec2(
        this.x - vec2.x,
        this.y - vec2.y
      );
    }
  },

  // Multiply this vector by the incoming `vec2`
  // TODO: mark dirty for other calcs
  multiply : function(vec2, returnNew) {
    var x,y;
    if (vec2.x !== undefined) {
      x = vec2.x;
      y = vec2.y;

    // Handle incoming scalars
    } else {
      x = y = vec2;
    }

    if (!returnNew) {
      this.x *= x;
      this.y *= y;
      return this;
    } else {
      return new Vec2(
        this.x * x,
        this.y * y
      );
    }
  },

  // Rotate this vector. Accepts a `Rotation` or angle in radians.
  //
  // Passing a truthy `inverse` will cause the rotation to
  // be reversed.
  //
  // If `returnNew` is truthy, a new
  // `Vec2` will be created with the values resulting from
  // the rotation. Otherwise the rotation will be applied
  // to this vector directly, and this vector will be returned.
  rotate : function(r, inverse, returnNew) {
    var
    x = this.x,
    y = this.y,
    rx, cos, sin, ry;

    inverse = (inverse) ? -1 : 1;

    if (r.s !== undefined) {
      sin = r.s;
      cos = r.c;
    } else {
      sin = Math.sin(r);
      cos = Math.cos(r)
    }

    var
    x = this.x,
    y = this.y,
    rx = cos * x - (inverse * sin) * y,
    ry = (inverse * sin) * x + cos * y;

    if (returnNew) {
      return new Vec2(rx, ry);
    } else {
      this.set(rx, ry);
      return this;
    }
  },

  // Calculate the length of this vector (the norm)
  // TODO: used cached value if available
  length : function() {
    var x = this.x, y = this.y;
    return Math.sqrt(x * x + y * y);
  },

  // Get the length squared. For performance, use this instead of `Vec2#length` (if possible).
  // TODO: use cached value if available
  lengthSquared : function() {
    var x = this.x, y = this.y;
    return x * x + y * y;
  },

  // Return the distance betwen this `Vec2` and the incoming vec2 vector
  // and return a scalar
  distance : function(vec2) {
    // TODO: prime candidate for optimizations
    return this.subtract(vec2, true).length();
  },

  distanceSquared : function(vec2) {
    var c = this.subtract(vec2, true);
    return c.lengthSquared();
  },

  // Convert this vector into a unit vector.
  // Returns the length.
  normalize : function() {
    var length = this.length();

    // Don't bother normalizing a vector with a length ~0
    if (length < Number.MIN_VALUE) {
      return 0;
    }

    // Collect a ratio to shrink the x and y coords
    var invertedLength = 1/length;

    // Convert the coords to be greater than zero
    // but smaller than or equal to 1.0
    this.x *= invertedLength;
    this.y *= invertedLength;

    return length;
  },

  // Determine if another `Vec2`'s components match this ones
  equal : function(v, w) {
    if (w === undefined) {  
      return (
          this.x === v.x &&
          this.y === v.y
      ); 
    } else {
      return (
          this.x === v &&
          this.y === w
      )
    }
  },

  // Return a new `Vec2` that contains the absolute value of
  // each of this vector's parts
  abs : function() {
    return new Vec2(
      Math.abs(this.x),
      Math.abs(this.y)
    );
  },

  // Return a new `Vec2` consisting of the smallest values
  // from this vector and the incoming
  //
  // When returnNew is truthy, a new `Vec2` will be returned
  // otherwise the minimum values in either this or `v` will
  // be applied to this vector.
  min : function(v, returnNew) {
    var
    tx = this.x,
    ty = this.y,
    vx = v.x,
    vy = v.y,
    x = tx < vx ? tx : vx,
    y = ty < vy ? ty : vy;

    if (returnNew) {
      return new Vec2(x, y);
    } else {
      this.x = x;
      this.y = y;
      return this;
    }
  },

  // Return a new `Vec2` consisting of the largest values
  // from this vector and the incoming
  //
  // When returnNew is truthy, a new `Vec2` will be returned
  // otherwise the minimum values in either this or `v` will
  // be applied to this vector.
  max : function(v, returnNew) {
    var
    tx = this.x,
    ty = this.y,
    vx = v.x,
    vy = v.y,
    x = tx > vx ? tx : vx,
    y = ty > vy ? ty : vy;

    if (returnNew) {
      return new Vec2(x, y);
    } else {
      this.x = x;
      this.y = y;
      return this;
    }
  },

  // Clamp values into a range.
  // If this vector's values are lower than the `low`'s
  // values, then raise them.  If they are higher than
  // `high`'s then lower them.
  //
  // Passing returnNew as true will cause a new Vec2 to be
  // returned.  Otherwise, this vector's values will be clamped
  clamp : function(low, high, returnNew) {
    var ret = this.min(high, true).max(low)
    if (returnNew) {
      return ret;
    } else {
      this.x = ret.x;
      this.y = ret.y;
      return this;
    }
  },

  // Ensure this vector contains finite values
  isValid : function() {
    return isFinite(this.x) && isFinite(this.y);
  },

  // Get the skew vector such that dot(skew_vec, other) == cross(vec, other)
  skew : function() {
    // Returns a new vector.
    return new Vec2(-this.y, this.x);
  },
  
  scale : function(scale, returnNew){
    if (returnNew) {
      return new Vec2(this.x*scale, this.y*scale);
    } else {
      this.x = this.x*scale;
      this.y = this.y*scale;
      return this;
    }
    
  },
  
  transpose : function (returnNew){
    if (returnNew) {
      return new Vec2(this.y, this.x);
    } else {
      var tx = this.x;
      var ty = this.y;
      this.x = ty;
      this.y = tx;
      return this;
    }    
  }
  
};
