var size = {width: 920, height: 520};
game = new Game({
	canvasArangement: function(game) {
		getCanvasArangements().lockAspectRatio(game);
		game.context.scale(.6, .6);
	},
    lockAspectRatioSize: size, canvasId: 'display', updateInterval: 1,
    addCustomTransforms: function(game) {
    	game.pointTransform.addScale(.6, .6);
    }
});

size.width = 820;
size.height = 464;

// TODO: ADD SCALING CANVAS

var zCount = 1;

var colors = ['white', 'yellow', 'blue', 'red', 'purple', 'orange', 'green', '#B50000', 'black'];

var inPocket = [];
var isBreak = true;

var pockets = [];

Back.prototype = Object.create(RenderedEntity.prototype);
Back.prototype.constructor = Back;
function Back() {
    this.render = function(c) {
        c.beginPath();
        c.rect(-size.width / 2, -size.height / 2, size.width, size.height);
        c.fillStyle = 'green';
        c.fill();
        var dot = function(x, y) {
	        c.beginPath();
	        c.arc(x, y, 7, 2 * Math.PI, false);
	        c.fillStyle = 'black';
	        c.fill();
	        c.beginPath();
	        c.arc(x, y, 3.5, 2 * Math.PI, false);
	        c.fillStyle = 'white';
	        c.fill();
    	};
    	dot(-size.width * (5/16), 0);
    	dot(size.width * (5/16), 0);
    }
    this.z = 0;
    this.create();
}

Front.prototype = Object.create(RenderedEntity.prototype);
Front.prototype.constructor = Front;
function Front() {
	this.z = 10001;
	this.render = function(c) {
		c.beginPath();
		c.rect(-size.width / 2 - 25, -size.height / 2 - 25, size.width + 50, size.height + 50);
		c.lineWidth = 15;
		c.strokeStyle = 'brown';
		c.stroke();
	}
	this.create();
}

var queuedMessages = [];
var displayingMessage = false;
Message.prototype = Object.create(RenderedEntity.prototype);
Message.prototype.constructor = Message;
function Message(text, isPlayer1, stylePoints, hold) {
	this.z = 10003;
	this.alpha = 0;
	this.reverse = false;
	this.text = text;
	this.isPlayer1 = isPlayer1;
	this.stepWhenPaused = true;
	this.awardedPoints = false;
	this.stylePoints = stylePoints;
	this.step = function(deltaTime) {
		if (!this.reverse) {
			this.alpha += 0.002 * deltaTime;
			if (this.alpha > 1) {
				this.hold = +new Date();
				this.reverse = true;
				this.alpha = 1;
			}
		} else {
			if (+new Date() - this.hold < 2000 || hold) {
				if (!this.awardedPoints) {
					if (this.isPlayer1) {
						playerManager.p1style += this.stylePoints;
					} else {
						playerManager.p2style += this.stylePoints;
					}
					this.awardedPoints = true;
				}
				return;
			}
			this.alpha -= 0.002 * deltaTime;
			if (this.alpha <= 0) {
				this.destroy();
				if (queuedMessages.length > 0) {
					queuedMessages[0].create();
					queuedMessages.splice(0, 1);
				} else {
					displayingMessage = false;
				}
			}
		}
	};
	this.render = function(c) {
		c.save();
		c.scale(1, -1);
		c.textBaseline = 'middle';
		c.textAlign = 'center';
		c.font = '60pt impact';
		if (isPlayer1) {
			c.fillStyle = 'rgba(255, 0, 0, ' + this.alpha + ')';
		} else {
			c.fillStyle = 'rgba(0, 0, 255, ' + this.alpha + ')';
		}
		c.fillText(this.text, 0, -320);
		var pointString = (isPlayer1 ? '< ' : '') + this.stylePoints + (isPlayer1 ? '' : ' >');
		c.fillText(pointString, 0, 320);
		c.restore();
	};
	if (!displayingMessage && queuedMessages.length === 0) {
		this.create();
		displayingMessage = true;
	} else {
		queuedMessages.push(this);
	}
}

PlayerManager.prototype = Object.create(RenderedEntity.prototype);
PlayerManager.prototype.constructor = PlayerManager;
function PlayerManager() {
	this.scored = 0;
	this.wrongBall = false;
	this.turnsUnbroken = 0;
	// true => player 1, false => player 2
	this.turn = true;
	this.p1IsSolids = null;
	this.p1style = 0;
	this.p1styleDisplay = 0;
	this.p2style = 0;
	this.p2styleDisplay = 0;
	this.lastTick = +new Date();
	this.stepWhenPaused = true;
	monitor.registerCallback({ priority: 1, recurring: true, fire: function() {

		if (playerManager.scored <= 0 || playerManager.wrongBall || playerManager.scratched) {
			playerManager.turn = !playerManager.turn;
			playerManager.turnsUnbroken = 0;
			if (playerManager.sunk8) {
				new Message('SCRATCH!', playerManager.turn, -50);
				new Message('Player ' + (!playerManager.turn ? '1' : '2') + ' Wins!', !playerManager.turn, 250, true);
			}
		} else {
			var scored = playerManager.scored;
			var msgText;
			var points = scored === 1 ? 10 : Math.pow(2, scored - 1) * 100;
			if (scored === 1) {
				msgText = 'Pocket Change';
			} else if (scored === 2) {
				msgText = '2 Birds, 1 Stone';
			} else if (scored === 3) {
				msgText = 'Trickshot!';
			} else if (scored === 4) {
				msgText = 'POOL SHARK SHOT!'
			} else if (scored === 5) {
				msgText = 'IMPOSSIBLE SHOT!!!';
			} else {
				msgText = 'Hacking? Really?';
				points = -50000;
			}
			new Message(msgText, playerManager.turn, points);
			if (playerManager.turnsUnbroken > 0) {
				var chain = playerManager.turnsUnbroken;
				msgText = '';
				var points2 = Math.pow(2, chain) * 100;
				if (chain === 1) {
					msgText = '2 in a Row';
				} else if (chain === 2) {
					msgText = '3 in a Row!';
				} else if (chain === 3) {
					msgText = 'It Keeps on Going!';
				} else {
					msgText = 'What Other Player?';
				}
				new Message(msgText, playerManager.turn, points);
			}
			playerManager.turnsUnbroken++;
			if (playerManager.sunk8) {
				new Message('SUNK THE 8!', playerManager.turn, 50);
				new Message('Player ' + (playerManager.turn ? '1' : '2') + ' Wins!', playerManager.turn, 250, true);
			}
		}
		playerManager.scored = 0;
		playerManager.wrongBall = false;
	}});
	this.step = function(deltaTime) {
		if (+new Date() - this.lastTick > 20) {
			this.lastTick = +new Date();
			if (this.p1style > this.p1styleDisplay) {
				this.p1styleDisplay++;
			} else if (this.p1styleDisplay > this.p1style) {
				this.p1styleDisplay--;
			}
			if (this.p2style > this.p2styleDisplay) {
				this.p2styleDisplay++;
			} else if (this.p2styleDisplay > this.p2style) {
				this.p2styleDisplay--;
			}
		}
	}
	this.render = function(c) {
		c.save();
		c.scale(1, -1);
		c.textBaseline = 'middle';
		c.textAlign = 'center';
		c.font = (this.turn ? 'bold ' : '') + '30pt Helvetica';
		c.fillStyle = 'red';
		c.fillText('Player 1' + (this.p1IsSolids === null ? '' : (this.p1IsSolids ? ' - Solid' : ' - Stripe')), -size.width / 2 - 120, -320);
		c.fillText('Style: ' + this.p1styleDisplay, -size.width / 2 - 120, 320);
		c.font = (!this.turn ? 'bold ' : '') + '30pt Helvetica';
		c.fillStyle = 'blue';
		c.fillText('Player 2' + (this.p1IsSolids === null ? '' : (this.p1IsSolids ? ' - Stripe' : ' - Solid')), size.width / 2 + 120, -320);
		c.fillText('Style: ' + this.p2styleDisplay, size.width / 2 + 120, 320);
		c.restore();
	};
	this.create();
}

var scratched = false;

Pocket.prototype = Object.create(BoundedEntity.prototype);
Pocket.prototype.constructor = Pocket;
function Pocket(x, y) {
	this.collisionLayer = 'pocket';
	this.collidesWith = ['object'];
	this.x = x;
	this.y = y;
	this.bounds = new BoundingBox.Circle(this, x === 0 ? 30 : 40);
	this.z = 10000;
	BoundedEntity.apply(this, [{}]);
	this.render = function(c) {
		c.beginPath();
		c.arc(this.x, this.y, this.bounds.radius, 0, 2 * Math.PI, false);
		c.fillStyle = 'black';
		c.fill();
	};
	this.onCollide = function(e) {
		if (e.grabbed) {
			return;
		}
		if (e.number === 0) {
			e.destroy();
			var count = 0;
			for (var i = 0; i < inPocket.length; ++i) {
				var check = inPocket[i];
				if ((playerManager.turn && playerManager.p1IsSolids) || (!playerManager.turn && !playerManager.p1IsSolids)) {
					if (check.number < 8) {
						count++;
					}
				} else if ((playerManager.turn && !playerManager.p1IsSolids) || (!playerManager.turn && playerManager.p1IsSolids)) {
					if (check.number > 8) {
						count++;
					}
				}
			}
			if (count >= 7) {
				new Message('Scratch!', playerManager.turn, -50);
				new Message('Player ' + (playerManager.turn ? '1' : '2') + ' Wins!', !playerManager.turn, 250);
				return;
			}
			new Message('Scratch!', playerManager.turn, -50);
			var scratch = function() {
				scratched = true;
				if (!settled) {
					setTimeout(scratch, 500);
					return;
				}
				e.setLoc(-size.width * (5/16), 0);
				e.vx = 0;
				e.vy = 0;
				e.create();
				whiteball.grabbed = true;
				whiteball.setLoc(game.getMouse().getLoc());
				/*if (inPocket.length > 0) {
					var penalty = inPocket.splice(inPocket.length - 1, 1)[0];
					penalty.setLoc(size.width * (5/16), 0);
					var entities = game.getEntities();
					for (var i = 0; i < entities.length; ++i) {
						if (!entities[i] instanceof PCircle) {
							continue;
						}
						if (penalty.bounds.collidesWith(entities[i].bounds)) {
							penalty.modifyLoc(-10, 0);
						}
					}
					penalty.vx = 0;
					penalty.vy = 0;
					penalty.create();
				}
				
				After some research, it was found that there are no penalty balls on a scratch

				*/
			}
			setTimeout(scratch, 500);
		} else if (e.number === 8) {
			e.destroy();
			if (isBreak) {
				new Message('AMAZING 8 BALL BREAK!', false, 10000, false);
				new Message('Player 1 Wins!', true, 250, false);
				game.pause();
			}
			var count = 0;
			for (var i = 0; i < inPocket.length; ++i) {
				var check = inPocket[i];
				if ((playerManager.turn && playerManager.p1IsSolids) || (!playerManager.turn && !playerManager.p1IsSolids)) {
					if (check.number < 8) {
						count++;
					}
				} else if ((playerManager.turn && !playerManager.p1IsSolids) || (!playerManager.turn && playerManager.p1IsSolids)) {
					if (check.number > 8) {
						count++;
					}
				}
			}
			if (count >= 7) {
				playerManager.sunk8 = true;
				return;
			}
			if (!playerManager.turn) {
				new Message('Eight Ball Foul!', false, -500, false);
				new Message('Player 1 Wins!', true, 250, true);
			} else {
				new Message('Eight Ball Foul!', true, -500, false);
				new Message('Player 2 Wins!', false, 250, true);
			}
			game.pause();
		} else {
			e.destroy();
			inPocket.push(e);
			if (playerManager.p1IsSolids === null) {
				if (playerManager.turn) {
					if (e.number < 8) {
						playerManager.p1IsSolids = true;
					} else {
						playerManager.p1IsSolids = false;
					}
				} else {
					if (e.number < 8) {
						playerManager.p1IsSolids = false;
					} else {
						playerManager.p1IsSolids = true;
					}
				}
				new Message('First Ball!', playerManager.turn, 50);
				playerManager.scored++;
			} else {
				if (playerManager.turn) {
					if (playerManager.p1IsSolids === (e.number < 8)) {
						playerManager.scored++;
					} else {
						new Message('Wrong Ball!', true, -100);
						playerManager.wrongBall = true;
					}
				} else {
					if (playerManager.p1IsSolids === (e.number > 8)) {
						playerManager.scored++;
					} else {
						new Message('Wrong Ball!', false, -100);
						playerManager.wrongBall = true;
					}
				}
			}
		}
	};
	this.isPocket = true;
	this.create();
}

var settled = true;
Monitor.prototype = Object.create(Entity.prototype);
Monitor.prototype.constructor = Monitor;
function Monitor() {
	var events = [];
	this.registerCallback = function(f) {
		events.push(f);
	}
	this.step = function(deltaTime) {
		if (settled) {
			return;
		}
		for (var i = 0; i < game.getEntities().length; ++i) {
			var ent = game.getEntities()[i];
			if (!(ent instanceof PCircle)) {
				continue;
			}
			if (ent.getVelocity().getMagnitude() >= 0.001) {
				return;
			} 
		}
		var preserve = [];
		events.sort(function(a, b) {
			if (!('priority' in a) && !('priority' in b)) {
				return 0;
			} else if (('priority' in a) && !('priority' in b)) {
				return 1;
			} else if (!('priority' in a) && ('priority' in b)) {
				return -1;
			} else {
				return b.priority - a.priority;
			}
		});
		for (var i = 0; i < events.length; ++i) {
			events[i].fire();
			if ('recurring' in events[i] && events[i].recurring) {
				preserve.push(events[i]);
			}
		}
		events = preserve;
		settled = true;
		scratched = false;
	}
	this.create();
}

var monitor = new Monitor();

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
	this.shootable = true;
	this.multiSample = true;
	this.collided = [];
	this.onCollide = function(e) {
		this.collided.push(e);
	};
	monitor.registerCallback({ priority: 2, recurring: true, fire: function() {
		this.collided = [];
	} });
	this.friction = 0.001;
	this.shootable = true;
	PhysicsEntity.apply(this, [{}]);
	this.step = function(deltaTime) {
		if (this.grabbed && this.number === 0) {
			this.enableCollisionResponse = false;
			this.shootable = false;
			if (game.getMouse().mouseDown) {
				if (this.isColliding()) {
					return;
				}
				this.grabbed = false;
				this.enableCollisionResponse = true;
				setTimeout(function() { whiteball.shootable = true; }, 1000);
				return;
			}
			var xi = this.x;
			var yi = this.y;
			this.x = game.getMouse().x;
			this.y = game.getMouse().y;
			//this.vx = 0.7 * this.vx + 0.3 * ((this.x - xi) / deltaTime);
			//this.vy = 0.7 * this.vy + 0.3 * ((this.y - yi) / deltaTime);
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
		c.lineWidth = 2;
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
		var diamond = function(x, y, sideways) {
    		c.beginPath();
    		c.moveTo(x - (sideways ? 5 : 2.5), y);
    		c.lineTo(x, y + (sideways ? 2.5 : 5));
    		c.lineTo(x + (sideways ? 5 : 2.5), y);
    		c.lineTo(x, y - (sideways ? 2.5 : 5));
    		c.closePath();
    		c.fillStyle = 'white';
    		c.fill();
    	};
    	if (this.bounds.width > this.bounds.height) {
    		diamond(this.x - this.bounds.width * (5/16), this.y, false);
    		diamond(this.x - this.bounds.width * (3/16), this.y, false);
    		diamond(this.x + this.bounds.width * (5/16), this.y, false);
    		diamond(this.x + this.bounds.width * (3/16), this.y, false);
    	} else {
    		diamond(this.x, this.y + this.bounds.height * .25, true);
    		diamond(this.x, this.y - this.bounds.height * .25, true);
    		if (this.x > 0) {
    			diamond(this.x, this.y, true);
    		}
    	}
    	if (this.bounds.width < this.bounds.height && this.x < 0) {
    		c.save();
    		c.translate(this.x, this.y);
    		c.scale(1, -1);
    		c.save();
    		c.scale(1, 2);
    		c.fillStyle = '#BA8510';
    		c.beginPath();
    		c.arc(0, 0, 10, 0, 2 * Math.PI, false);
    		c.fill();
    		c.restore();
    		c.rotate(Math.PI / 2);
    		c.textBaseline = 'middle';
    		c.textAlign = 'center';
    		c.fillStyle = '#393500';
    		c.font = '7pt Florence, cursive';
    		c.fillText('Cgame', 0, 0);
    		c.restore();
    	}
	};
	this.create();
}

new Back();
new Front();
new PRect(0, -size.height / 2, size.width, 50, false, 0);
new PRect(-size.width / 2, 0, 50, size.height, false, 0);
new PRect(0, size.height / 2, size.width, 50, false, 0);
new PRect(size.width / 2, 0, 50, size.height, false, 0);
var ymove = 0;
var rowNum = 5;
var balls = [];
var skip = [1, 8];
var corner1Solid = false;
for (var i = 0; i < 5; ++i) {
	var x = size.width * (1/4) + 20 * i;
	var yShift = -10 * i;
	for (var j = 0; j <= i; j++) {
		var y = yShift + 20 * j;
		if (i === 2 && j === 1) {
			var eight = new PCircle(x, y, 10, 30);
			eight.number = 8;
		} else if (i === 0 && j === 0) {
			var one = new PCircle(x, y, 10, 30);
			one.number = 1;
		} else if (i === 4 && j === 0) {
			var botCorner = new PCircle(x, y, 10, 30);
			if (Math.round(Math.random())) {
				botCorner.number = Math.round(Math.random() * 5) + 2;	
				corner1Solid = true;
			} else {
				botCorner.number = Math.round(Math.random() * 6) + 9;
			}
			skip.push(botCorner.number);
		} else if (i === 4 && j === 4) {
			var topCorner = new PCircle(x, y, 10, 30);
			if (corner1Solid) {
				topCorner.number = Math.round(Math.random() * 6) + 9;
			} else {
				topCorner.number = Math.round(Math.random() * 5) + 2;
			}
			skip.push(topCorner.number);
		} else {
			balls.push(new PCircle(x, y, 10, 30));
		}
	}
}
var assign = 2;
balls = shuffle(balls);
for (var i = 0; i < balls.length; ++i) {
	while (skip.indexOf(assign) !== -1) {
		assign++;
	}
	balls[i].number = assign;
	assign++;
}

var whiteball = new PCircle(-size.width * (5/16), 0, 10, 30);
whiteball.number = 0;

monitor.registerCallback({ priority: 0, recurring: true, fire: function() {
} });

MouseWatcher.prototype = Object.create(Entity.prototype);
MouseWatcher.prototype.constructor = MouseWatcher;
function MouseWatcher() {
	var downLoc = null;
	var upLoc = null;
	this.z = 10002;
	this.step = function(deltaTime) {
		if (game.getMouse().mouseDown && downLoc === null && settled) {
			downLoc = { x: game.getMouse().x, y: game.getMouse().y };
		}
		if (downLoc !== null && !game.getMouse().mouseDown && settled) {
			if (whiteball.getVelocity().getMagnitude() < 0.001 && whiteball.shootable) {
				upLoc = { x: game.getMouse().x, y: game.getMouse().y };
				var baseline = Util.dist(downLoc, whiteball);
				var direction = new Vector(whiteball.x - upLoc.x, whiteball.y - upLoc.y);
				var magnitude = direction.getMagnitude() - baseline;
				if (magnitude > 200) {
					magnitude = 200;
				}
				if (magnitude < 10) {
					magnitude = 0;
					downLoc = null;
					upLoc = null;
					return;
				}
				var nv = direction.toUnitVector().times(magnitude).divide(100);
				whiteball.setVelocity(nv);
				settled = false;
			}
			downLoc = null;
			upLoc = null;
		}
	};
	this.render = function(c) {
		if (downLoc !== null && settled && whiteball.shootable) {
			var baseline = Util.dist(game.getMouse().getLoc(), whiteball);
			var direction = new Vector(game.getMouse().x - whiteball.x, game.getMouse().y - whiteball.y);
			var magnitude = direction.getMagnitude() - Util.dist(downLoc, whiteball);
			if (magnitude > 200) {
				magnitude = 200;
			}
			if (magnitude < 0) {
				magnitude = 0;
			}
			// Scale the magnitude from the size physics wise to the rendering size
			magnitude /= 2;
			
			var start = whiteball.getLoc().add(direction.toFixedLengthVector(40 + magnitude));
			c.save();
			c.translate(start.x, start.y);
			c.rotate(Math.atan2(direction.y, direction.x));
			c.beginPath();
			c.rect(0, -2.5, 3, 5);
			c.fillStyle = 'black';
			c.fill();
			c.beginPath();
			c.rect(3, -2.5, 10, 5);
			c.fillStyle = 'white';
			c.fill();
			c.beginPath();
			c.rect(13, -2.5, 110, 5);
			c.fillStyle = 'rgb(210, 180, 120)';
			c.fill();
			c.beginPath()
			c.rect(123, -2.5, 110, 5);
			c.fillStyle = 'rgb(80, 0, 0)';
			c.fill();
			c.restore();
		}
	};
	this.create();
}
new MouseWatcher();

pockets.push(new Pocket(-size.width / 2 + 10, -size.height / 2 + 10));
pockets.push(new Pocket(-size.width / 2 + 10, size.height / 2 - 10));
pockets.push(new Pocket(size.width / 2 - 10, -size.height / 2 + 10));
pockets.push(new Pocket(size.width / 2 - 10, size.height / 2 - 10));
pockets.push(new Pocket(0, size.height / 2));
pockets.push(new Pocket(0, -size.height / 2));

monitor.registerCallback({ priority: 0, fire: function() {
	var spread = 0;
	var entities = game.getEntities();
	var counter = 0;
	for (var i = 0; i < entities.length; ++i) {
		if (entities[i] instanceof PCircle) {
			for (var j = 0; j < entities.length; ++j) {
				if (entities[j] instanceof PCircle) {
					spread += Util.dist(entities[i], entities[j]);
					counter ++;
				}
			}
		}
	}
	spread /= counter;
	if (spread > 210 && !scratched) {
		//new Message('Nice Break!', true);
		new Message('Nice Break!', true, 50);
	} else if (spread < 110) {
		new Message('Slow Start', true, -50);
	}
	isBreak = false;
}});

var playerManager = new PlayerManager();

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

/*game.canvas.addEventListener('mousedown', function(e) {
	var entity = getMouseEntity();
	if (entity != null) {
		entity.grabbed = true;
	}
});*/

