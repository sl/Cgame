
var size = {width: 920, height: 520};
game = new Game({
    canvasArangement: getCanvasArangements().lockAspectRatio,
    lockAspectRatioSize: size, canvasId: 'display', updateInterval: 18
});

Back.prototype = Object.create(RenderedEntity.prototype);
Back.prototype.constructor = Back;
function Back() {
    this.render = function(c) {
        c.beginPath();
        c.rect(-size.width / 2, -size.height / 2, size.width, size.height);
        c.fillStyle = '#AEEEEE';
        c.fill();
        c.beginPath();
        c.fillStyle = '573B0C';
        c.rect(-size.width / 2, -size.height / 2, size.width, 30);
        c.fill();
    }
    this.create();
    this.z = 1;
}

GameOver.prototype = Object.create(RenderedEntity.prototype);
GameOver.prototype.constructor = GameOver;
function GameOver() {
    this.render = function(c) {
        c.beginPath();
        c.rect(-size.width / 2, -size.height / 2, size.width, size.height);
        c.fillStyle = 'white';
        c.fill();
        c.textBaseline = 'middle';
        c.textAlign = 'center';
        c.font = '40pt Helvetica';
        c.strokeStyle = 'black';
        c.fillStyle = 'black';
        c.save();
        c.scale(1, -1);
        c.fillText('Game Over', 0, -100);
        c.fillText('You got ' + player.score.score, 0 , 0);
        c.fillText('Click to play again!', 0, 100);
        c.restore();
    };
    this.z = 10;
    this.create();
}

Score.prototype = Object.create(RenderedEntity.prototype);
Score.prototype.constructor = Score;
function Score() {
    this.score = 0;
    this.render = function(c) {
        c.fillStyle = 'white';
        c.strokeStyle = 'black';
        c.font = '40pt Helvetica';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.save();
        c.scale(1, -1);
        c.fillText(this.score + '', 0, -size.height / 2 + 75);
        c.lineWidth = 3;
        c.strokeText(this.score + '', 0, -size.height / 2 + 75);
        c.restore();
    }
    this.z = 9;
    this.create();
}


Pipe.prototype = Object.create(PhysicsEntity.prototype);
Pipe.prototype.constructor = Pipe;
function Pipe(props, parent) {
    var isParent = false;
    if (parent == null) {
        isParent = true;
    }
    this.z = 2;
    var args = props;
    args.collisionLayer = 'pipe';
    args.collidesWith = ['bird'];
    this.vy = 0;
    this.hasMadeNewSet = false;
    this.hasGivenScore = false;
    if (isParent) {
        this.vx = -0.15;
        this.x = size.width/2 + 200;
        var height = (Math.random() * (3/8) * size.height + (1/8) * size.height);
        this.y = -size.height / 2 + height / 2


        args.bounds = new BoundingBox.AABB(this, .1 * size.width, height);
        this.step = function(deltaTime) {
            PhysicsEntity.prototype.step.apply(this, [deltaTime]);
            this.child.x = this.x;
            if (this.x <= size.width / 2 && !this.hasMadeNewSet) {
                new Pipe({});
                this.hasMadeNewSet = true;
            }
            if (this.x <= 0 && !this.hasGivenScore) {
                player.score.score++;
                this.hasGivenScore = true;
            }
            if (this.x <= -size.width * (9/8)) {
                this.destroy();
                this.child.destroy();
            }
        };
    } else {
        this.vx = 0;
    }
    PhysicsEntity.apply(this, [args]);
    if (isParent) {
        this.child = new Pipe({x: this.x}, this);
    }
    if (!isParent) {
        var coords = Util.getCoordsFromBounds(null, null, parent.bounds.max().y + (2/8) * size.height, size.height/2);
        this.y = coords.y;
        this.bounds = new BoundingBox.AABB(this, .1 * size.width, coords.height)
    }
    this.render = function(c) {
        c.beginPath();
        c.rect(this.bounds.min().x, this.bounds.min().y, this.bounds.width, this.bounds.height);
        c.fillStyle = 'green';
        c.fill();
        c.lineWidth = 3;
        c.strokeStyle = 'black';
        c.stroke();
        c.beginPath();
        c.arc(this.x, this.y, 10, 0, 2 * Math.PI, false);
        c.fillStyle = 'black';
        c.fill();
        c.fillStyle = 'blue';
        c.beginPath();
        c.arc(this.bounds.min().x, this.bounds.min().y, 5, 0, 2 * Math.PI, false);
        c.fill();
        c.beginPath();
        c.arc(this.bounds.min().x, this.bounds.max().y, 5, 0, 2 * Math.PI, false);
        c.fill();
        c.beginPath();
        c.arc(this.bounds.max().x, this.bounds.min().y, 5, 0, 2 * Math.PI, false);
        c.fill();
        c.beginPath();
        c.arc(this.bounds.max().x, this.bounds.max().y, 5, 0, 2 * Math.PI, false);
        c.fill();
    }
    this.create();
}

Bird.prototype = Object.create(PhysicsEntity.prototype);
Bird.prototype.constructor = Bird;
function Bird() {
    PhysicsEntity.apply(this, arguments);
    this.collisionLayer = 'bird';
    this.collidesWith = ['pipe'];
    this.x = 0;
    this.y = 0;
    this.z = 3;
    this.vx = 0;
    this.vy = 0;
    this.bounds = new BoundingBox.AABB(this, 30, 15);
    this.score = new Score();
    this.step = function (deltaTime) {
        this.vy -= .002 * deltaTime;
        PhysicsEntity.prototype.step.apply(this, arguments);
        if (Math.abs(this.y) > size.height / 2) {
            this.gameover = new GameOver();
            game.pause();
        }
    };
    this.render = function(c) {
        c.save();
        c.scale(1.5, 1);
        c.beginPath();
        c.arc(this.x, this.y, this.bounds.width / 2, 0, 2 * Math.PI, false);
        c.restore();
        c.fillStyle = 'yellow';
        c.fill();
        c.lineWidth = 3;
        c.strokeStyle = 'black';
        c.stroke();
        c.beginPath();
        c.arc(this.x + this.bounds.width / 3, this.y + this.bounds.height / 2.5, 3, 0, 2 * Math.PI, false);
        c.fillStyle = 'black';
        c.fill();
        if (this.vy <= 0) {
            c.beginPath();
            c.moveTo(this.x - 10, this.y - 2.5);
            c.lineTo(this.x, this.y + 1);
            c.lineTo(this.x + 10, this.y - 2.5);
        } else {
            c.beginPath();
            c.moveTo(this.x - 10, this.y - 2.5);
            c.lineTo(this.x, this.y - 7.5);
            c.lineTo(this.x + 10, this.y - 2.5);
        }
        c.lineWidth = 2;
        c.stroke();
    };
    this.onCollide = function(entity) {
        this.gameover = new GameOver();
        game.pause();
    };
    this.reset = function() {
        var toRemove = [];
        for (var i = 0; i < game.getEntities().length; ++i) {
            if (game.getEntities()[i] instanceof Pipe) {
                toRemove.push(game.getEntities()[i]);
            }
        }
        for (var i = 0; i < toRemove.length; ++i) {
            toRemove[i].destroy();
        }
        this.x = 0;
        this.y = 0;
        this.vy = 0;
        this.score.score = 0;
        new Pipe({});
    };
    this.create();
}

player = new Bird();
new Back();
new Pipe({});
game.startUpdating();
game.canvas.addEventListener('mousedown', function() {
    if (player.gameover != null) {
        player.gameover.destroy();
        player.gameover = null;
        player.reset();
        game.unpause();
    }
    player.vy = .6;
}, false);

