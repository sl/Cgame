var size = {width: 920, height: 520};
game = new Game({
	canvasArangement: getCanvasArangements().lockAspectRatio,
    lockAspectRatioSize: size, canvasId: 'display', updateInterval: 1
});

var zCount = 1;

Back.prototype = Object.create(RenderedEntity.prototype);
Back.prototype.constructor = Back;
function Back() {
    this.render = function(c) {
        c.beginPath();
        c.rect(-size.width / 2, -size.height / 2, size.width, size.height);
        c.fillStyle = 'white';
        c.fill();
    }
    this.z = 0;
    this.create();
}

PCircle.prototype = Object.create(PhysicsEntity.prototype);
PCircle.prototype.constructor = PCircle;
function PCircle(x, y, radius, mass) {
	this.collisionLayer = 'object';
	this.collidesWith = ['object', 'wall'];
	this.enableCollisionResponse = true;
	this.x = x;
	this.y = y;
	this.z = zCount++;
	this.vx = 0;
	this.vy = 0;
	this.mass = mass;
	this.restitution = 0.25;
	this.multiSample = true;
	this.bounds = new BoundingBox.Circle(this, radius);
	this.grabbed = false;
	this.grabable = true;
	PhysicsEntity.apply(this, [{}]);
	this.step = function(deltaTime) {
		if (this.grabbed) {
			if (!game.getMouse().mouseDown) {
				this.grabbed = false;
				return;
			}
			var xi = this.x;
			var yi = this.y;
			this.x = game.getMouse().x;
			this.y = game.getMouse().y;
			this.vx = 0.7 * this.vx + 0.3 * ((this.x - xi) / deltaTime);
			this.vy = 0.7 * this.vy + 0.3 * ((this.y - yi) / deltaTime);
		} else {
			this.vy -= .003 * deltaTime;
			PhysicsEntity.prototype.step.apply(this, arguments);
		}
	};
	this.render = function(c) {
		c.beginPath();
		c.arc(this.x, this.y, this.bounds.radius, 0, 2 * Math.PI, false);
		c.fillStyle = '#AEEEEE';
		c.strokeStyle = 'black';
		c.lineWidth = 3;
		c.fill();
		c.stroke();
	};
	this.create();
}

PRect.prototype = Object.create(PhysicsEntity.prototype);
PRect.prototype.constructor = PRect;
function PRect(x, y, width, height, hasGravity, mass) {
	if (hasGravity) {
		this.collisionLayer = 'object';
		this.collidesWith = ['object', 'wall'];
		this.grabable = true;
	} else {
		this.collisionLayer = 'wall';
		this.collidesWith = ['object'];
		this.grabable = false;
	}
	this.enableCollisionResponse = true;
	this.x = x;
	this.y = y;
	this.z = zCount++;
	this.vx = /*hasGravity ? 1 : */0;
	this.vy = 0;
	this.mass = mass;
	this.restitution = 0.25;
	this.multiSample = true;
	this.bounds = new BoundingBox.AABB(this, width, height);
	this.hasGravity = hasGravity;
	this.grabbed = false;
	PhysicsEntity.apply(this, {});
	this.step = function(deltaTime) {
		if (this.grabbed) {
			if (!game.getMouse().mouseDown) {
				this.grabbed = false;
				return;
			}
			var xi = this.x;
			var yi = this.y;
			this.x = game.getMouse().x;
			this.y = game.getMouse().y;
			this.vx = 0.7 * this.vx + 0.3 * ((this.x - xi) / deltaTime);
			this.vy = 0.7 * this.vy + 0.3 * ((this.y - yi) / deltaTime);
		} else {
			if (this.hasGravity) {
				this.vy -= .003 * deltaTime;
			}
			PhysicsEntity.prototype.step.apply(this, arguments);
		}
	};
	this.render = function(c) {
		c.beginPath();
		c.rect(this.bounds.min().x, this.bounds.min().y, this.bounds.width, this.bounds.height);
		c.fillStyle = '#AEEEEE';
		c.strokeStyle = 'black';
		c.lineWidth = 3;
		c.fill();
		c.stroke();
	};
	this.create();
}

new Back();
new PRect(0, -size.height / 2, size.width, 50, false, 0);
new PRect(-size.width / 2, 0, 50, size.height, false, 0);
new PRect(0, size.height / 2, size.width, 50, false, 0);
new PRect(size.width / 2, 0, 50, size.height, false, 0);

function getMouseEntity() {
	var contacts = [];
	for (var i = 0; i < game.getEntities().length; ++i) {
		if (!(game.getEntities()[i].hasOwnProperty('grabable') && game.getEntities()[i].grabable)) {
			continue;
		}
		if (game.getEntities()[i].bounds.isPointInside(game.getMouse())) {
			contacts.push(game.getEntities()[i]);
		}
	}
	if (contacts.length <= 0) {
		return null;
	}
	if (contacts.length === 1) {
		return contacts[0];
	}
	contacts.sort(Util.sortZ);
	return contacts[0];
}

//new PRect(0, 0, 50, 30, true, 30);
//new PCircle(20, 200, 30, 30);
game.startUpdating();
document.addEventListener('keydown', function(e) {
    if (e.keyCode === 65) {
        new PRect(game.getMouse().x, game.getMouse().y, 60, 60, true, 30);
    } else if (e.keyCode === 83) {
        new PCircle(game.getMouse().x, game.getMouse().y, 30, 30);
    } else if (e.keyCode === 82) {
        var del = [];
        for (var i = 5; i < game.getEntities().length; ++i) {
            del.push(game.getEntities()[i]);
        }
        for (var i = 0; i < del.length; ++i) {
            del[i].destroy();
        }
    } else if (e.keyCode === 68) {
        new PRect(game.getMouse().x, game.getMouse().y, 60, 60, true, 5000000);
    }
}, false);

game.canvas.addEventListener('mousedown', function(e) {
	var entity = getMouseEntity();
	if (entity != null) {
		entity.grabbed = true;
	}
});