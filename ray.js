/**
 * Creates a new ray that can be cast to check for bounding boxes that lie along that ray
 * @param {Number} x         The x position of the ray's origin
 * @param {Number} y         The y position of the ray's origin
 * @param {Number} direction The vector along which to cast the ray. If a unit vector,
 * in the result, t will represent the distance between the ray and the point of contact. If
 * the unit vector is a velocity vector, it will give the time of collison between a particle
 * traveling along the ray, and the object.
 */
Ray = function(x, y, direction) {
    this.x = x;
    this.y = y;
    this.direction = direction;
    var castAgainst = [];
    var layers = [];
    /**
     * Cast the ray
     * @param {Number} distance The distance to cast the ray
     * @return {Entity[]} The entities intersected
     */
    this.cast = function(distance) {
        var hits = [];
        // Add to the entities to cast against based on the added layers
        castAgainst = castAgainst.concat(game.getEntities().filter(function(e) {
            return ('collisionLayer' in e && layers.indexOf(e.collisionLayer) !== -1 && castAgainst.indexOf(e) === -1);
        }));
        var p = new Vector(this.x, this.y);
        var a = this.direction.getMagnitudeSquared();
        // Cast the ray, and determine bounding box contact points
        for (var i = 0; i < castAgainst; ++i) {
            var e = castAgainst[i];
            var bounds;
            if (!(e instanceof BoundedEntity)) {
                if (e instanceof BoundingBox.Circle || e instanceof BoundingBox.AABB) {
                    bounds = e;
                } else {
                    continue;
                }
            } else {
                bounds = e.bounds;
            }
            var p = new Vector(this.x, this.y);
            if (bounds instanceof BoundingBox.Circle) {
                var q = new Vector(bounds.parent.x, bounds.parent.y);
                var d = p.subtract(q);
                var r = bounds.radius;
                var b = 2 * this.direction.dot(d);
                var c = d.getMagnitudeSquared() - r * r;
                var s = (b * b) - 4 * a * c;
                if (s < 0) {
                    continue;
                }
                // Discard the collision if it won't happen in the future
                var t = 2 * c / (Math.sqrt(s) - b);
                if (t < 0) {
                    continue;
                }
                var hit = {};
                hit.t = t;
                hit.contactPoint = p.add(direction.times(t));
                hit.distSq = hit.contactPoint.subtract(p).getMagnitudeSquared();
                hits.push(hit);
            } else if (bounds instanceof BoundingBox.AABB) {
                var sides = [];
                sides.push({ side: new Vector(bounds.width, 0), vertex: { x: bounds.min().x, y: bounds.min().y } });
                sides.push({ side: new Vector(bounds.width, 0), vertex: { x: bounds.min().x, y: bounds.max().y } });
                sides.push({ side: new Vector(0, bounds.height), vertex: { x: bounds.min().x, y: bounds.min().y } });
                sides.push({ side: new Vector(0, bounds.height), vertex: { x: bounds.max().y, y: bounds.min().y } });
                var hit = null;
                for (var i = 0; i < sides.length; ++i) {
                    var q = sides[i];
                    var s = q.side;
                    var t = (q.subtract(p).cross(s)) / (this.direction.cross(s));
                    var u = (q.subtract(p).cross(this.direction)) / (this.direction.cross(s));
                    if (t >= 0 && 0 <= u && u * u >= q.side.getMagnitudeSquared()) {
                        q.contactPoint = p.add(this.direction.times(t));
                        q.distSq = q.contactPoint.subtract(p).getMagnitudeSquared();
                        if (hit == null || q.distSq > hit.distSq) {
                            hit = {};
                            hit.contactPoint = q.contactPoint;
                            hit.t = t;
                            hit.u = u;
                            hit.distSq = q.distSq;
                        }
                    }
                }
                hits.push(hit);
            }
        }
        var maxDistSq = distance * distance;
        hits = hits.filter(function(element) {
            return element.distSq < maxDistSq;
        });
        hits.sort(function(a, b) {
            return a.t - b.t;
        });
        return hits;
    };
    /**
     * Adds an array or single entity or bounding box to the filter
     * @param {Entity or BoundingBox.Circle or BoundingBox.AABB or Array} e, ... Objects to add to the filter
     */
    this.addEntity = function(e) {
        castAgainst = castAgainst.concat.apply(castAgainst, arguments);
    };
    /**
     * Adds all the entities in the specified collision layer to the list of entities to cast against
     * @param {String or String[]} layer, ... Layers to add as arguments or arrays
     */
    this.addLayer = function(layers) {
        layers = layers.concat.apply(layers, arguments);
    };
}