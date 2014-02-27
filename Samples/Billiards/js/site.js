var size = {width: 920, height: 520};
game = new Game({
	canvasArangement: getCanvasArangements().lockAspectRatio,
    lockAspectRatioSize: size, canvasId: 'display', updateInterval: 1
});

var zCount = 1;

var colors = ['white', 'yellow', 'blue', 'red', 'purple', 'orange', 'green', '#B50000', 'black'];

Back.prototype = Object.create(RenderedEntity.prototype);
Back.prototype.constructor = Back;
function Back() {
    this.render = function(c) {
        c.beginPath();
        c.rect(-size.width / 2, -size.height / 2, size.width, size.height);
        c.fillStyle = 'green';
        c.fill();
    }
    this.z = 0;
    this.create();
}

Pocket.prototype = Object.create(PhysicsEntity.prototype);
Pocket.prototype.constructor = Pocket;
function Pocket(x, y) {
	this.collisionLayer = 'pocket';
	this.collidesWith = ['object'];
	this.x = x;
	this.y = y;
	this.bounds = new BoundingBox.Circle(this, 40);
	this.z = 10000;
	PhysicsEntity.apply(this, [{}]);
	this.render = function(c) {
		c.beginPath();
		c.arc(this.x, this.y, this.bounds.radius, 0, 2 * Math.PI, false);
		c.fillStyle = 'black';
		c.fill();
	};
	this.create();
}

MouseWatcher.prototype = Object.create(MouseWatcher.prototype);
MouseWatcher.prototype.constructor = MouseWatcher;
function MouseWatcher() {
	var downLoc = null;
	var upLoc = null;
	this.step = function(deltaTime) {

	}
	this.create();
}

PCircle.prototype = Object.create(PhysicsEntity.prototype);
PCircle.prototype.constructor = PCircle;
function PCircle(x, y, radius, mass) {
	this.collisionLayer = 'object';
	this.collidesWith = ['object', 'wall', 'pocket'];
	this.enableCollisionResponse = true;
	this.x = x;
	this.y = y;
	this.z = zCount++;
	this.vx = 0;
	this.vy = 0;
	this.mass = mass;
	this.restitution = 1;
	this.bounds = new BoundingBox.Circle(this, radius);
	this.grabbed = false;
	this.grabable = true;
	this.friction = 0.001;
	PhysicsEntity.apply(this, [{}]);
	this.step = function(deltaTime) {
		if (this.grabbed && this.number === 0) {
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
			PhysicsEntity.prototype.step.apply(this, arguments);
		}
	};
	this.render = function(c) {
		c.beginPath();
		c.arc(this.x, this.y, this.bounds.radius, 0, 2 * Math.PI, false);
		c.fillStyle = 'white';
		c.fill();
		c.save();
		c.beginPath();
		if (this.number > 8) {
			c.rect(this.x - this.bounds.radius, this.y - this.bounds.radius / 2, this.bounds.radius * 2, this.bounds.radius);
			c.clip();
		}
		c.beginPath();
		c.arc(this.x, this.y, this.bounds.radius, 0, 2 * Math.PI, false);
		c.fillStyle = colors[this.number === 8 ? 8 : this.number % 8];
		c.fill();
		c.restore();
		c.lineWidth = 3;
		c.strokeStyle = 'black';
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
	this.restitution = 1;
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
		c.fillStyle = 'brown';
		c.lineWidth = 3;
		c.fill();
	};
	this.create();
}

new Back();
new PRect(0, -size.height / 2, size.width, 50, false, 0);
new PRect(-size.width / 2, 0, 50, size.height, false, 0);
new PRect(0, size.height / 2, size.width, 50, false, 0);
new PRect(size.width / 2, 0, 50, size.height, false, 0);
var ymove = 0;
var rowNum = 5;
var balls = [];
for (var i = 0; i < 5; ++i) {
	var x = size.width * (1/4) + 30 * i;
	var yShift = -15 * i;
	for (var j = 0; j <= i; j++) {
		var y = yShift + 30 * j;
		if (i === 2 && j === 1) {
			var eight = new PCircle(x, y, 15, 30);
			eight.number = 8;
		} else {
			balls.push(new PCircle(x, y, 15, 30));
		}
	}
}

var assign = 1;
balls = shuffle(balls);
for (var i = 0; i < balls.length; ++i) {
	balls[i].number = assign;
	assign++;
	if (assign === 8) {
		assign = 9;
	}
}

var whiteball = new PCircle(-size.width * (5/16), 0, 15, 30);
whiteball.number = 0;

new Pocket(-size.width / 2 + 10, -size.height / 2 + 10);
new Pocket(-size.width / 2 + 10, size.height / 2 - 10);
new Pocket(size.width / 2 - 10, -size.height / 2 + 10);
new Pocket(size.width / 2 - 10, size.height / 2 - 10);
new Pocket(0, size.height / 2);
new Pocket(0, -size.height / 2);


game.startUpdating();

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

function shuffle(array) {
  var currentIndex = array.length
    , temporaryValue
    , randomIndex
    ;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

game.canvas.addEventListener('mousedown', function(e) {
	var entity = getMouseEntity();
	if (entity != null) {
		entity.grabbed = true;
	}
});

