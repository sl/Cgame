
var size = {width: 920, height: 520};
game = new Game({
    canvasArangement: getCanvasArangements().lockAspectRatio,
    lockAspectRatioSize: size, canvasId: 'display'
});

Square.prototype = Object.create(RenderedEntity.prototype);
Square.prototype.constructor = Square;
function Square() {
    this.render = function(c) {
        c.beginPath();
        c.rect(-size.width / 2, -size.height / 2, size.width, size.height);
        c.fillStyle = 'white';
        c.fill();
    }
    this.create();
    this.z = 1;
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
new Square();
new Pipe({});
game.startUpdating();

Bird.prototype = Object.create(PhysicsEntity.prototype);
Bird.prototype.constructor = Bird;
function Bird() {

}
