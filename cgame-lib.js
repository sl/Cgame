(function() {

    // Set up Protected references

    var nextUID = 1;
    var getId = function(obj) {
        if (obj == null) {
            return null;
        }
        if (obj.__obj_id == null) {
            obj.__obj_id = nextUID++;
        }
        return obj.__obj_id;
    };
    var p = {};
    var id = function(obj) {
        if (obj == null) {
            return null;
        }
        if (p[getId(obj) + ''] == null) {
            p[getId(obj)] = {};
        }
        return getId(obj) + '';
    };

    // Public and Private variable and constant declarations and definitions

    /**
     * The main game instance
     * @type {Game}
     */
    var instance;

    //Exceptions

    /**
     * Thrown to indicate that a preference was missing, or its value was Invalid
     * @param {String} preference The invalid or missing preference
     * @param {String} message The error message
     */
    var PreferenceException = function(preference, message) {
        this.name = 'PreferenceException';
        this.message = 'Invalid value for preference "' + preference + '", ' + message;
    };

    // Utility function definitions

    /**
     * Gets one of the provided canvas arangements.
     * @return {Function} A method that applies the arangement.
     */
    getCanvasArangements = function() {
        return {
            /**
             * Arranges the canvas so that is maintains the aspect ratio specfied in the preferences lockAspectRatio.width
             * and lockAspectRatio.height
             * @param  {Game} game The main game instance
             * @throws {PreferenceException} If The lockAspectRatioSize.width or lockAspectRatioSize.height preferences are
             * missing or invalid.
             */
            lockAspectRatio: function(game) {
                if (game.prefs.hasOwnProperty('lockAspectRatioSize')) {
                    if (!(game.prefs.lockAspectRatioSize.hasOwnProperty('width') && game.prefs.lockAspectRatioSize.hasOwnProperty('height'))) {
                        throw 'Specified lockAspectRatioSize, but lockAspectRatioSize did not contain both a width and height property';
                    }
                    game.canvas.width = window.innerWidth;
                    game.canvas.height = window.innerHeight;
                    var s = Math.min(game.canvas.height / game.prefs.lockAspectRatioSize.height, game.canvas.width / game.prefs.lockAspectRatioSize.width);
                    game.context.translate(game.canvas.width / 2 | 0, game.canvas.height / 2 | 0);
                    game.context.scale(s, -s);
                    game.context.beginPath();
                    game.context.rect(-game.prefs.lockAspectRatioSize.width / 2, -game.prefs.lockAspectRatioSize.height / 2, game.prefs.lockAspectRatioSize.width,
                        game.prefs.lockAspectRatioSize.height);
                    game.context.clip();
                    if (game.pointTransform == null) {
                        game.pointTransform = new PointTransform();
                        game.pointTransform.addOther(function(point) {
                            var s = Math.min(instance.canvas.height / instance.prefs.lockAspectRatioSize.height, instance.canvas.width / instance.prefs.lockAspectRatioSize.width);
                            var nx = point.x - (instance.canvas.width / 2 | 0);
                            var ny = point.y - (instance.canvas.height / 2 | 0);
                            nx = nx / s;
                            ny = ny / -s;
                            return {x: nx, y: ny};
                        });
                        if ('addCustomTransforms' in game.prefs) {
                            game.prefs.addCustomTransforms(game);
                        }
                    }
                } else {
                    throw new PreferenceException('lockAspectRatioSize',
                        'Used lockAspectRatio canvas arangement without setting lockAspectRatioSize preference');
                }
            },
            /**
             * Arranges the canvas so that it takes up the entire window regardless of the window's size
             * @param  {Game} game The main game instance
             */
            fillScreen: function(game) {
                game.canvas.width = window.innerWidth();
                game.canvas.height = window.innerHeight();
                game.context.scale(1, -1);
                if (game.pointTransform == null) {
                    game.pointTransform.addOther(function(point) {
                        var ret = point;
                        ret.y *= -1;
                        return ret;
                    });
                    if ('addCustomTransforms' in game.prefs) {
                        game.prefs.addCustomTransforms(game);
                    }
                }
            },
            /**
             * Arranges the canvas so that it always stays at the fixed size specified in  the preferences
             * fixedSizeArangementSize.width, and fixedSizeArangementSize.height
             * @param  {Game} game The main game instance
             */
            fixedSize: function(game) {
                // If a fixed size is specified, fix the canvas size to that, otherwise, do not modify the canvas's size
                if (game.prefs.hasOwnProperty('fixedSizeArangementSize')) {
                    if (!(game.prefs.fixedSizeArangementSize.hasOwnProperty('width') && game.prefs.fixedSizeArangementSize.hasOwnProperty('height'))) {
                        throw new PreferenceException('fixedSizeArangementSize',
                            'Specified fixedSizeArangementSize, but fixedSizeArangementSize did not contain both a width and height property');
                    }
                    game.canvas.width = game.prefs.fixedSizeArangementSize.width;
                    game.canvas.height = game.prefs.fixedSizeArangementSize.height;
                    game.context.scale(1, -1);
                    if (game.pointTransform == null) {
                        game.pointTransform.addOther(function(point) {
                            var ret = point;
                            ret.y *= -1;
                            return ret;
                        });
                        if ('addCustomTransforms' in game.prefs) {
                            game.prefs.addCustomTransforms(game);
                        }
                    }
                }
            }
        };
    };

    Util = {
        /**
         * Gets a value clamped within a range
         * @param  {Number} x   The value to clamp
         * @param  {Number} min The minimum of the clamping range
         * @param  {Numver} max The maximum of the clamping range
         * @return {Number}     The value clamped within the specified range
         */
        clamp: function(x, min, max) {
            return x < min ? min : (x > max ? max : x);
        },
        /**
         * Finds the center of an AABB given the positions of its corners
         * @param  {Number} x1 The first x position
         * @param  {Number} x2 The second x position
         * @param  {Number} y1 The first y position
         * @param  {Number} y2 The second y position
         * @return {Object}    The coordinates of the center of the AABB
         */
        getCoordsFromBounds: function(x1, x2, y1, y2) {
            var coords = {};
            coords.x = (x1 + x2) / 2;
            coords.y = (y1 + y2) / 2;
            coords.width = x1 - x2;
            coords.height = y1 - y2;
            coords.width = Math.abs(coords.width);
            coords.height = Math.abs(coords.height);
            return coords;
        },
        /**
         * A function for sorting entities by their z index
         * @param  {Entity} a The first entity to compare
         * @param  {Entity} b The second entity to compare
         * @return {Number}   The result of the comparison
         */
        sortZ: function(a, b) {
            if (a.hasOwnProperty('z') && b.hasOwnProperty('z')) {
                return (a.z - b.z);
            } else if (a.hasOwnProperty('z')) {
                return 1;
            } else if (b.hasOwnProperty('z')) {
                return -1;
            } else {
                return 0;
            }
        },
        /**
         * Gets the distnace squared between two points
         * @param  {Object} a The first point
         * @param  {Object} b The second point
         * @return {Number}   The squared distance between the two objects
         */
        distSquared: function(a, b) {
            return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
        },
        /**
         * Gets the distance between two points
         * @param  {Object} a The first point
         * @param  {Object} b The second point
         * @return {Nuber}   The distance between the two objects
         */
        dist: function(a, b) {
            return Math.sqrt(Util.distSquared(a, b));
        }
    };

    /**
     * Keeps track of the current transformation of the canvas to allow for transforming from screen to game coordinates
     */
    function PointTransform() {
        var operations = [];
        /**
         * Transforms a point using all of the operations added to the PointTransform
         * @param  {Object} point The point to transform
         * @return {Object}       The transformed point
         */
        this.transformPoint = function(point) {
            var newPoint = point;
            //for (var i = operations.length - 1; i >= 0; --i) {
            for (var i = 0; i < operations.length; ++i) {
                newPoint = operations[i](newPoint);
            }
            return newPoint;
        };
        /**
         * Adds a scale operation to the PointTransform
         * @param {Number} x The scale amount in the x axis
         * @param {Number} y The scale amount in the y axis
         */
        this.addScale = function(x, y) {
            operations.push(function(point) {
                var np = {};
                np.x = point.x / x;
                np.y = point.y / y;
                return np;
            });
        };
        /**
         * Adds a translate operation to the pointTransform
         * @param {Number} x The translation along the x axis
         * @param {Number} y The translation along the y axis
         */
        this.addTranslate = function(x, y) {
            operations.push(function(point) {
                var np = {};
                np.x = point.x - x;
                np.y = point.y - y;
                return np;
            });
        };
        /**
         * Adds an operation to the point transform
         * @param {Function} f The operation to add. Should take an object with the x and y coordinates as its properties as input,
         * and return an object with the transformed x and y coordinates as its properties
         */
        this.addOther = function(f) {
            operations.push(f);
        }
    };

    // Class Definitions

    /*
    List of all preferences references:

    timeScale {Number} the rate at which time passes (for example, a value of 2 would make the game's speed pass twice as fast as real time)
    updateInterval {Number} the interval of time between game ticks
    canvasArangement {Function} the canvas arangement to use, templaces can be gotten using getCanvasArangements()

    lockAspectRatioSize {width: Number, height: Number} aspect ratio size for lockAspectRatio canvas arangement
    fixedSizeArangementSize {width: Number, height: Number} size for fixedSize canvas arangement

     */
    Game = function(prefs) {
        instance = this;

        /**
         * The preferences for the game
         * @type {Object}
         * @public
         */
        this.prefs = prefs;

        /**
         * All entities registered with the game
         * @type {Array}
         * @private
         */
        var entities = [];
        /**
         * The entity with control of the foreground
         * @type {Entity}
         * @private
         */
        var foregroundEntity = null;
        /**
         * The entity with control of the background
         * @type {Entity}
         * @private
         */
        var backgroundEntity = null;
        /**
         * If the game is paused
         * @type {Boolean}
         * @private
         */
        var paused = false;
        /**
         * If the game should continue the update cycle
         * @type {Boolean}
         * @private
         */
        var updating = true;
        /**
         * The last time (in milliseconds since the unix epoch) an update ran
         * @type {Number}
         * @private
         */
        var lastTime = null;

        // Initializes any preferences that are necessary but weren't assigned
        
        /**
         * Gets the games mouse object
         * @type {Object}
         */
        var mouse;
        /**
         * Gets the location of the mouse as a vector
         * @return {Vector}   The location of the mouse as a vector
         */
        mouse = { x: null, y: null, mouseDown: false, getLoc: function() { return new Vector(this.x, this.y); } };

        if (!this.prefs.hasOwnProperty('timeScale')) {
            this.prefs.timeScale = 1;
        }
        if (!this.prefs.hasOwnProperty('updateInterval')) {
            this.prefs.updateInterval = 20;
        }
        if (!this.prefs.hasOwnProperty('canvasArangement')) {
            this.prefs.canvasArangement = getCanvasArangements().fixedSize;
        }

        // Public methods

        /**
         * If the update cycle should continue registering updates with the DOM scheduler
         * @return {Boolean} If the update cycle should continue registering updates with the DOM scheduler
         */
        this.shouldContinueUpdateCycle = function() {
            return updating;
        };
        /**
         * Starts the update cycle
         */
        this.startUpdating = function() {
            updating = true;
            p[id(this)].setupCanvas();
            p[id(this)].update();
        };
        /**
         * Stops the update cycle
         */
        this.stopUpdating = function() {
            updating = false;
        };

        /**
         * Stops performing logic tics on all entities except those that have stepWhenPaused = true
         * @fires Entity#onUnpause
         */
        this.pause = function() {
            paused = true;
            for (var i = 0; i < entities.length; ++i) {
                if ('onPause' in entities[i]) {
                    entities[i].onPause();
                }
            }
        };
        /**
         * Unpauses the game, resuming logic tics on all entities
         * @fires Entity#onUnpause
         */
        this.unpause = function() {
            paused = false;
            for (var i = 0; i < entities.length; ++i) {
                if ('onUnpause' in entities[i]) {
                    entities[i].onUnpause();
                }
            }
        };
        /**
         * If the game is paused
         * @return {Boolean} If the game is paused
         */
        this.isPaused = function() {
            return paused;
        };

        /**
         * Gets an array containing all entities currently registered with the game
         * @return {Array} The array of entities
         */
        this.getEntities = function() {
            return entities;
        };
        /**
         * Gets the entity that has control of the foreground
         * @return {Entity} The foreground entity, or null if there is no entity with foreground control
         */
        this.getForegroundEntity = function() {
            return foregroundEntity;
        };
        /**
         * Gets the entity that has control of the background
         * @return {Entity} The background entity, or null if there is no entity with background control
         */
        this.getBackgroundEntity = function() {
            return backgroundEntity;
        };

        /**
         * Gets the mouse object
         * @return {Object} The mouses position and status
         */
        this.getMouse = function() {
            return mouse;
        };

        // Protected methods

        /**
         * Gets the amount of time elapsed since the last logic tick
         * @return {Number} The amount of time since the last logic tick
         */
        p[id(this)].getDeltaTime = function() {
            if (lastTime === null) {
                lastTime = +new Date();
                return 0;
            }
            var dt = (+new Date()) - lastTime;
            lastTime = +new Date();
            return dt;
        };

        /**
         * Requests that an entity take control of the foreground
         * @param  {Entity} entity The entity requesting control of the foreground
         * @fires Entity#onResignForegroundRequest
         * @return {Boolean} If the entity successfully took control of the foreground
         */
        p[id(this)].requestForeground = function(entity) {
            if (foregroundEntity === null) {
                foregroundEntity = entity;
                return true;
            }
            if ('onResignForegroundRequest' in foregroundEntity) {
                if (foregroundEntity.onResignForegroundRequest(entity)) {
                    foregroundEntity = entity;
                    return true;
                }
            }
            return false;
        };
        /**
         * Resigns the foreground, will do nothing if resigner is not the entity that currently has control of the foreground
         * @param  {Entity} resigner The entity attempting to resign the foreground
         * @return {Entity} The entity that took control of the foreground from the resigner
         */
        p[id(this)].resignForeground = function(resigner) {
            if (resigner !== foregroundEntity) {
                return null;
            }
            foregroundEntity = null;
            for (var i = 0; i < entities.length; ++i) {
                if ('onForegroundAvailable' in entities[i]) {
                    if (entities[i].onForegroundAvailable()) {
                        if (p[id(instance)].requestForeground(entities[i])) {
                            return entities[i];
                        }
                    }
                }
            }
            return null;
        };
        /**
         * Requests that an entity take control of the background
         * @param  {Entity} entity The entity requesting control of the background
         * @fires Entity#onResignBackgroundRequest
         * @return {Boolean} If the entity successfully took control of the background
         */
        p[id(this)].requestBackground = function(entity) {
            if (backgroundEntity === null) {
                backgroundEntity = entity;
                return true;
            }
            if ('onResignBackgroundRequest' in backgroundEntity) {
                if (backgroundEntity.onResignBackgroundRequest(entity)) {
                    backgroundEntity = entity;
                    return true;
                }
            }
            return false;
        };
        /**
         * Resigns the background, will do nothing if resigner is not the entity that currently has control of the background
         * @param  {Entity} resigner The entity attempting to resign the background
         * @return {Entity} The entity that took control of the background from the resigner
         */
        p[id(this)].resignBackground = function(resigner) {
            if (resigner !== backgroundEntity) {
                return null;
            }
            backgroundEntity = null;
            for (var i = 0; i < entities.length; ++i) {
                if ('onBackgroundAvailable' in entities[i]) {
                    if (entities[i].onBackgroundAvailable()) {
                        if (p[id(instance)].requestBackground(entities[i])) {
                            return entities[i];
                        }
                    }
                }
            }
            return null;
        };
        /**
         * Sorts the list of all entities from low to high by their z index values
         */
        p[id(this)].sortEntitiesByZIndex = function() {
            entities.sort(Util.sortZ);
        };

        /**
         * Adds an entity to the list of managed entities
         * @param {Entity} entity The entity to add
         * @return {Entity} The entity added
         */
        p[id(this)].addEntity = function(entity) {
            entities.push(entity);
            return entity;
        };
        /**
         * Removes an entity from the list of managed entities
         * @param  {Entity} entity The entity to remove
         * @return {Entity} The entity removed
         */
        p[id(this)].removeEntity = function(entity) {
            entities.splice(entities.indexOf(entity), 1);
            return entity;
        };

        /**
         * Sets up the game's canvas
         */
        p[id(this)].setupCanvas = function() {
            if (!instance.prefs.hasOwnProperty('canvasId') || typeof instance.prefs.canvasId  !== 'string') {
                throw new PreferenceException('canvasId', 'was not a valid HTML id');
            }
            instance.canvas = document.getElementById(instance.prefs.canvasId);
            instance.context = instance.canvas.getContext('2d');
            instance.canvas.addEventListener('mousemove', function(e) {
                var rect = instance.canvas.getBoundingClientRect();
                var untransformedMouse = {}
                untransformedMouse.x = e.clientX - rect.left;
                untransformedMouse.y = e.clientY - rect.top;
                var nmouse = instance.pointTransform.transformPoint(untransformedMouse);
                mouse.x = nmouse.x;
                mouse.y = nmouse.y;
            }, false);
            instance.canvas.addEventListener('mousedown', function(e) {
                mouse.mouseDown = true;
            });
            instance.canvas.addEventListener('mouseup', function(e) {
                mouse.mouseDown = false;
            });
        };

        /**
         * Runs a logic tick and draws the game to the canvas
         * Updates will recur every instance.prefs.updateInterval seconds while shouldContinueUpdateCycle() is true
         */
        p[id(this)].update = function() {
            // Run a game logic tick
            p[id(instance)].step(p[id(instance)].getDeltaTime() / instance.prefs.timeScale);
            // Update the canvas position, size and translation
            instance.context.save();
            instance.prefs.canvasArangement(instance);
            // Render all entities now that the canvas has been transformed
            p[id(instance)].render(instance.context);
            // Restore the context
            if (game.prefs.debugMouse) {
                instance.context.beginPath();
                instance.context.arc(game.getMouse().x, game.getMouse().y, 5, 0, Math.PI * 2, false);
                instance.context.fillStyle = 'black';
                instance.context.fill();
                instance.context.beginPath();
                instance.context.arc(0, 0, 5, 0, Math.PI * 2, false);
                instance.context.fill();
            }
            instance.context.restore();
            // Schedule the next update with the DOM
            if (instance.shouldContinueUpdateCycle()) {
                setTimeout(p[id(instance)].update, instance.prefs.updateInterval);
            }
        };
        /**
         * Runs a single logic tick
         * @param  {Number} deltaTime The time elapsed since the last logic tick
         */
        p[id(this)].step = function(deltaTime) {
            for (var i = 0; i < entities.length; ++i) {
                if ('step' in entities[i]) {
                    if (!instance.isPaused() || entities[i].stepWhenPaused) {
                        entities[i].step(deltaTime);
                    }
                }
            }
        };
        /**
         * Renders the game to the canvas
         * Will draw the background entity first, the foreground entity last, and the rest by order of z index
         * from low to high
         * @param  {RenderingContext} c The game's canvas' rendering context
         */
        p[id(this)].render = function(c) {
            // Render the background entity
            if (backgroundEntity !== null && 'render' in backgroundEntity) {
                c.save();
                backgroundEntity.render(c);
                c.restore();
            }
            // Sort the entities based on their z indexes so they can be rendered in the correct order.
            p[id(instance)].sortEntitiesByZIndex();
            // Render all of the entities excluding the background and foreground entities
            for (var i = 0; i < entities.length; ++i) {
                if (entities[i] !== backgroundEntity && entities[i] !== foregroundEntity && 'render' in entities[i]) {
                    c.save();
                    entities[i].render(c);
                    c.restore();
                }
            }
            // Render the foreground entity
            if (foregroundEntity !== null && 'render' in foregroundEntity) {
                c.save();
                foregroundEntity.render(c);
                c.restore();
            }
        };
    };

    // Vectors

    /**
     * Creates a 2D vector
     * @param {Number} x The x component of the vector
     * @param {Number} y The y component of the vector
     */
    Vector = function(x, y) {
        this.x = x;
        this.y = y;
        /**
         * Gets the magnitude of the vector squared (faster than getMagnitude, use whenever possible)
         * @return {Number} The magnitude of the vector squared
         */
        this.getMagnitudeSquared = function() {
            return this.x * this.x + this.y * this.y;
        };
        /**
         * Gets the magnitude of the vector (getMagnitudeSquared is faster, so use it instead whenever possible)
         * @return {Number} The magnitude of the vector
         */
        this.getMagnitude = function() {
            return Math.sqrt(this.getMagnitudeSquared());
        };
        /**
         * Componentwise adds another vector to the vector
         * @param {Vector} v The vector to add
         * @return {Vector} The resulting vector
         */
        this.add = function(v) {
            return new Vector(this.x + v.x, this.y + v.y);
        };
        /**
         * Componentwise subtracts another vector from the vector
         * @param  {Vector} v The vector to subtract
         * @return {Vector}   The resulting vector
         */
        this.subtract = function(v) {
            return new Vector(this.x - v.x, this.y - v.y);
        };
        /**
         * Divides a vector by a scalar value
         * @param  {Number} s The number to divide the vector by
         * @return {Vector}   The resulting vector
         */
        this.divide = function(s) {
            return new Vector(this.x / s, this.y / s);
        };
        /**
         * Multiplies a vector by a scalar value
         * @param  {Number} s The number to multiply the vector by
         * @return {Vector}   The resulting vector
         */
        this.times = function(s) {
            return new Vector(this.x * s, this.y * s);
        };
        /**
         * Gets the dot product of the vector and another vector
         * @param  {Vector} v The vector to take the dot product with
         * @return {Number}   The result of the dot product operation
         */
        this.dot = function(v) {
            return this.x * v.x + this.y * v.y;
        };
        /**
         * Gets the magnitude of this vector projected onto another vector
         * @param  {Vector} v The vector to project this one on
         * @return {Number}   The magnitude of the the projected vector
         */
        this.projectionMagnitude = function(v) {
            return this.dot(v) / this.getMagnitude();
        };
        /**
         * Gets the unit vector with the same direction as the vector
         * @return {Vector} The resulting unit vector
         */
        this.toUnitVector = function() {
            var mag = this.getMagnitude();
            return new Vector(this.x / mag, this.y / mag);
        };
        /**
         * Gets a vector of the specified length in the same direction as the vector
         * @param  {Number} n The magnitude of the resulting vector
         * @return {Vector}   The resulting vector
         */
        this.toFixedLengthVector = function(n) {
            return this.toUnitVector().times(n);
        };
        /**
         * Gets the angle in radians of the direction that the vector points
         * @return {Number} The angle in radians of the vector's direction
         */
        this.toAngle = function() {
            return Math.atan2(this.y, this.x);
        }
    };

    // Collision logic

    /**
     * Checks if an axis aligned bounding box collides with a circular bounding box
     * @param {BoundingBox.AABB} aabb The Axis Aligned Bounding Box
     * @param {BoundingBox.Circle} c  The Circular Bounding Box
     */
    var AABBcollidesWithCircle = function(aabb, c) {
        var circleDistance = {};
        circleDistance.x = Math.abs(c.parent.x - aabb.parent.x);
        circleDistance.y = Math.abs(c.parent.y - aabb.parent.y);
        if (circleDistance.x > (aabb.width / 2 + c.radius)) {
            return false;
        }
        if (circleDistance.y > (aabb.height / 2 + c.radius)) {
            return false;
        }
        if (circleDistance.x <= (aabb.width / 2)) {
            return true;
        }
        if (circleDistance.y <= (aabb.height / 2)) {
            return true;
        }
        var cornerDistSquared = (circleDistance.x - aabb.width / 2) * (circleDistance.x - aabb.width / 2) +
            (circleDistance.y - aabb.height / 2) * (circleDistance.y - aabb.height / 2);
        return cornerDistSquared <= (c.radius) * (c.radius);
    };

    /**
     * A collection of bounding boxes
     * @type {Object}
     */
    BoundingBox = {
        /**
         * An axis aligned rectangle bounding box
         * @param {PhysicsEntity} parent The parent entity
         * @param {Number} width  The width of the bounding box
         * @param {Number} height The height of the bounding box
         */
        AABB: function(parent, width, height) {
            this.parent = parent;
            this.width = width;
            this.height = height;
            this.max = function() {
                return { x: this.parent.x + this.width / 2, y: this.parent.y + this.height / 2 };
            };
            this.min = function() {
                return { x: this.parent.x - this.width / 2, y: this.parent.y - this.height / 2 };
            };
            this.collidesWith = function(b) {
                if (b instanceof BoundingBox.AABB) {
                    return !(this.max().x < b.min().x || this.min().x > b.max().x ||
                        this.max().y < b.min().y || this.min().y > b.max().y);
                } else if (b instanceof BoundingBox.Circle) {
                    return AABBcollidesWithCircle(this, b);
                }
            };
            this.isPointInside = function(p) {
                if (p.x < this.max().x && p.x > this.min().x && p.y < this.max().y && p.y > this.min().y) {
                    return true;
                }
                return false;
            };
        },
        /**
         * A circular collider
         * @param {PhysicsEntity} parent The parent entity
         * @param {Number} radius The radius of the collider
         */
        Circle: function(parent, radius) {
            this.parent = parent;
            this.radius = radius;
            this.collidesWith = function(b) {
                if (b instanceof BoundingBox.Circle) {
                    var A = new Vector(this.parent.x, this.parent.y);
                    var B = new Vector(b.parent.x, b.parent.y)
                    return B.subtract(A).getMagnitudeSquared() < (this.radius + b.radius) * (this.radius + b.radius);
                } else if (b instanceof BoundingBox.AABB) {
                    return AABBcollidesWithCircle(b, this);
                }
            };
            this.isPointInside = function(p) {
                var rSquared = this.radius * this.radius;
                var dSquared = (this.parent.x - p.x) * (this.parent.x - p.x) + (this.parent.y - p.y) * (this.parent.y - p.y);
                if (dSquared < rSquared) {
                    return true;
                }
                return false;
            };
        }
    };

    /**
     * A collection of collision related utility functions
     * @type {Object}
     */
    var Collision = {
        /**
         * An axis aligned rectangle bounding box
         * @param {PhysicsEntity} parent The parent entity
         * @param {Number} width  The width of the bounding box
         * @param {Number} height The height of the bounding box
         */
        AABB: BoundingBox.AABB,
        /**
         * A circular collider
         * @param {PhysicsEntity} parent The parent entity
         * @param {Number} radius The radius of the collider
         */
        Circle: BoundingBox.Circle,
        /**
         * Checks for, and resolves a collisions between two entities
         * @param  {PhysicsEntity} e1 The first entity
         * @param  {PhysicsEntity} e2 The second entity
         */
        checkAndResolveCollision: function(e1, e2) {
            if (e1 === e2) {
                return;
            }
            if (e1.collidesWith == null || e2.collidesWith == null ||
                    e1.collidesWith.length === 0 || e2.collidesWith.length === 0) {
                return;
            }
            if (e1.collidesWith.indexOf(e2.collisionLayer) === -1 || e2.collidesWith.indexOf(e1.collisionLayer) === -1) {
                return;
            }
            var manifold;
            var switched = false;
            if (!e1.bounds.collidesWith(e2.bounds)) {
                return null;
            }
            if (e1.bounds instanceof Collision.Circle && e2.bounds instanceof Collision.Circle) {
                manifold = Collision.getManifoldCvC(e1, e2);
            } else if (e1.bounds instanceof Collision.AABB && e2.bounds instanceof Collision.AABB) {
                manifold = Collision.getManifoldAABBvAABB(e1, e2);
            } else {
                if (e1.bounds instanceof Collision.AABB) {
                    manifold = Collision.getManifoldAABBvC(e1, e2);
                } else {
                    manifold = Collision.getManifoldAABBvC(e2, e1);
                    switched = true;
                }
            }
            if (manifold == null) {
                return null;
            }
            if (switched) {
                var resolved = Collision.resolveCollision(e2, e1, manifold);
                if (resolved == null) {
                    return null;
                }
                resolved = Collision.positionalCorrection(resolved.e1, resolved.e2, manifold);
                var switchedResolved = {};
                switchedResolved.e1 = resolved.e2;
                switchedResolved.e2 = resolved.e1;
                return switchedResolved;
            }
            var resolved = Collision.resolveCollision(e1, e2, manifold);
            if (resolved == null) {
                return null;
            }
            resolved = Collision.positionalCorrection(resolved.e1, resolved.e2, manifold);
            if (e1.bounds instanceof Collision.Circle && e2.bounds instanceof Collision.Circle) {
            }
            return resolved;
        },
        /**
         * Gets the minimum of two entities restitutions
         * @param  {PhysicsEntity} e1 The first entity
         * @param  {PhysicsEntity} e2 The second entity
         * @return {Number}    The lower of the two entities restitutions
         */
        minR: function(e1, e2) {
            return Math.min(e1.restitution, e2.restitution);
        },
        /**
         * Generates a manifold for a circle v circle collision
         * @param  {PhysicsEntity} e1 The first entity
         * @param  {PhysicsEntity} e2 The second entity
         * @return {Object}    The collision manifold
         */
        getManifoldCvC: function(e1, e2) {
            var m = {};
            m.A = new Vector(e1.x, e1.y);
            m.B = new Vector(e2.x, e2.y);
            m.n = m.B.subtract(m.A);
            var r = e1.bounds.radius + e2.bounds.radius;
            var d;
            if (m.n.getMagnitudeSquared() > r * r) {
                return null;
            }
            d = m.n.getMagnitude();
            if (d !== 0) {
                m.penetration = r - d;
                m.normal = m.n.toUnitVector().times(-1);
                return m;
            } else {
                m.penetration = e1.radius;
                m.normal = new Vector(1, 0);
                return m;
            }
        },
        /**
         * Generates a manifold for an AABB v AABB collision
         * @param  {PhysicsEntity} e1 The first entity
         * @param  {PhysicsEntity} e2 The second entity
         * @return {Object}    The collision manifold
         */
        getManifoldAABBvAABB: function(e1, e2) {
            var m = {};
            m.A = new Vector(e1.x, e1.y);
            m.B = new Vector(e2.x, e2.y);
            m.n = m.B.subtract(m.A);
            var abox = e1.bounds;
            var bbox = e2.bounds;
            var aExtent = abox.width / 2;
            var bExtent = bbox.width / 2;
            var xOverlap = aExtent + bExtent - Math.abs(m.n.x);
            if (xOverlap > 0) {
                aExtent = abox.height / 2;
                bExtent = bbox.height / 2;
                var yOverlap = aExtent + bExtent - Math.abs(m.n.y);
                if (yOverlap > 0) {
                    if (xOverlap > yOverlap) {
                        if (m.n.y > 0) {
                            m.normal = new Vector(0, -1);
                        } else {
                            m.normal = new Vector(0, 1);
                        }
                        m.penetration = yOverlap;
                        return m;
                    } else {
                        if (m.n.x > 0) {
                            m.normal = new Vector(-1, 0);
                        } else {
                            m.normal = new Vector(1, 0);
                        }
                        m.penetration = xOverlap;
                        return m;
                    }
                }
            }
            return null;
        },
        /**
         * Generates a manifold for an AABB v circle collision
         * @param  {PhysicsEntity} aabb The entity with the AABB collider
         * @param  {PhysicsEntity} c    The entity with the circle collider
         * @return {Object}      The collision manifold
         */
        getManifoldAABBvC: function(aabb, c) {
            var m = {};
            m.A = new Vector(aabb.x, aabb.y);
            m.B = new Vector(c.x, c.y);
            m.n = m.B.subtract(m.A);
            var xExtent = aabb.bounds.width / 2;
            var yExtent = aabb.bounds.height / 2;
            var closest = {};
            closest.x = Util.clamp(c.x, aabb.bounds.min().x, aabb.bounds.max().x);
            closest.y = Util.clamp(c.y, aabb.bounds.min().y, aabb.bounds.max().y);
            var inside = false;
            // If circle is inside AABB, clamp circles center to closest edge
            if (m.n.x === closest.x && m.n.y === closest.y) {
                inside = true;
                // Find and clamp to closest axis
                if (Math.abs(m.n.x) > Math.abs(m.n.y)) {
                    if (closest.x > 0) {
                        closest.x = xExtent;
                    } else {
                        closest.x = -xExtent;
                    }
                } else {
                    if (closest.y > 0) {
                        closest.y = yExtent;
                    } else {
                        closest.y = -yExtent;
                    }
                }
            }
            /*var normal = m.n.subtract(closest);
            var d = normal.getMagnitudeSquared();
            var r = c.bounds.radius;
            d = Math.sqrt(d);*/
            var normal = new Vector(closest.x - c.x, closest.y - c.y);
            var cache = normal;
            var d = normal.getMagnitude();
            normal = normal.toUnitVector();
            var r = c.bounds.radius;
            if (inside) {
                m.normal = normal.times(-1);
            }
            m.normal = normal;
            m.penetration = r - d;
            return m;
        },
        /**
         * Resolves a collision between two entities
         * @param  {PhysicsEntity} e1       The first entity
         * @param  {PhysicsEntity} e2       The second entity
         * @param  {Object} manifold The collision manifold
         */
        resolveCollision: function(e1, e2, manifold) {
            var rv = e1.getVelocity().subtract(e2.getVelocity());
            var contactVelocity = rv.dot(manifold.normal);
            if (contactVelocity > 0) {
                return null;
            }
            var e = Collision.minR(e1, e2);
            var j = -(1 + e) * contactVelocity;
            j /= e1.invMass + e2.invMass;
            var impulse = manifold.normal.times(j);
            e1.applyAcceleration(impulse.times(e1.invMass));
            e2.applyAcceleration(impulse.times(e2.invMass * -1));
            var resolved = {};
            resolved.e1 = e1;
            resolved.e2 = e2;
            return resolved;
        },
        /**
         * Corrects the position of two entities that have collided to stop them from sinking into eachother
         * @param  {PhysicsEntity} e1       The first entity
         * @param  {PhysicsEntity} e2       The second entity
         * @param  {Object} manifold The collision manifold
         */
        positionalCorrection: function(e1, e2, manifold) {
            // Correction percent
            var percent = 1.01;
            // Correction threshhold
            var slop = 0.01;
            var correction = manifold.normal.times(percent * (Math.max(manifold.penetration - slop, 0) / (e1.invMass + e2.invMass)));
            e1.modifyLoc(correction.times(e1.invMass));
            e2.modifyLoc(correction.times(-1 * e2.invMass));
           // e1.modifyLoc(Math.random() * 0.001 - 0.0005, Math.random() * 0.001 - 0.0005);
           // e2.modifyLoc(Math.random() * 0.001 - 0.0005, Math.random() * 0.001 - 0.0005);
            var resolved = {};
            resolved.e1 = e1;
            resolved.e2 = e2;
            return resolved;
        }
    };

    // Entity and subclasses

    /**
     * Represents a game object that can be updated and drawn. In most cases, Entity should be
     * inherited from rather than instanced
     * @param {Object} props The properties to initialize the entity with
     */
    Entity = function(props) {
        if (props === undefined) {
            return;
        }
        var prefKeys = Object.getOwnPropertyNames(props);
        // Copy all properties of the props object
        for (var i = 0; i < prefKeys.length; ++i) {
            this[prefKeys[i]] = props[prefKeys[i]];
        }
        this.destroyed = true;
    };
    /**
     * Creates the entity, puting it under the main game instance's management
     */
    Entity.prototype.create = function() {
    	this.destroyed = false;
        p[id(instance)].addEntity(this);
    };
    /**
     * Destroys the entity, removing it from the main game instance's management
     */
    Entity.prototype.destroy = function() {
    	this.destroyed = true;
        p[id(instance)].removeEntity(this);
    };

    /**
     * Creates an entity that can be rendered to the canvas
     * @param {Object} properties The properties to initialize the  with
     *                            {Object}.x  The x location
     *                            {Object}.y  The y location
     *                            {Object}.z  The z index
     */
    RenderedEntity = function() {
        Entity.apply(this, arguments);
    };
    RenderedEntity.prototype = Object.create(Entity.prototype);
    RenderedEntity.prototype.constructor = RenderedEntity;

    /**
     * Requests control of the foreground
     * @return {Boolean} If the entity successfully took control of the foreground
     */
    RenderedEntity.prototype.requestForeground = function() {
        if (!('render' in this)) {
            return;
        }
        return p[id(instance)].requestForeground(this);
    };
    /**
     * Resigns control of the foreground
     * @return {Entity} The entity that took foreground control, or null if the entity didn't have foreground control or if no
     * entity took foreground control
     */
    RenderedEntity.prototype.resignForeground = function() {
        return p[id(instance)].resignForeground(this);
    };
    /**
     * Requests control of the background
     * @return {Boolean} If the entity successfully took control of the background
     */
    RenderedEntity.prototype.requestBackground = function() {
        if (!('render' in this)) {
            return;
        }
        return p[id(instance)].requestBackground(this);
    };
    /**
     * Resigns control of the background
     * @return {Entity} The entity that took background control, or null if the entity didn't have background control or if no
     * entity took background control
     */
    RenderedEntity.prototype.resignBackground = function() {
        return p[id(instance)].resignBackground(this);
    };

    /**
     * Sets the RenderedEntity's x position
     * @param {Number} x The new x position
     */
    RenderedEntity.prototype.setX = function(x) {
        this.x = x;
    };
    /**
     * Sets the RenderedEntity's y position
     * @param {Number} y The new y position
     */
    RenderedEntity.prototype.setY = function(y) {
        this.y = y;
    };
    /**
     * Sets the RenderedEntity's z index
     * @param {Number} z The new z index
     */
    RenderedEntity.prototype.setZ = function(z) {
        this.z = z;
    };
    /**
     * Gets the RenderedEntity's x position
     */
    RenderedEntity.prototype.getX = function() {
        return this.x;
    };
    /**
     * Gets the RenderedEntity's y position
     */
    RenderedEntity.prototype.getY = function() {
        return this.y;
    };
    /**
     * Gets the RenderedEntity's z index
     */
    RenderedEntity.prototype.getZ = function() {
        return this.z;
    };
    /**
     * Sets the RenderedEntity's location
     *
     * If passed an object, the entity will take on the x, y and z position/index values set in that objects properties
     * If passed two numbers, will set the x and y position of the entity
     * If passed three numbers, will set the x, y and z position/index values of the entity
     */
    RenderedEntity.prototype.setLoc = function() {
        if (arguments.length === 0) {
            return;
        } else if (arguments.length === 1) {
            var location = arguments[0];
            this.x = location.x || this.x;
            this.y = location.y || this.y;
            this.z = location.z || this.z;
        } else if (arguments.length === 2) {
            this.x = arguments[0];
            this.y = arguments[1];
        } else if (arguments.length >= 3) {
            this.x = arguments[0];
            this.y = arguments[1];
            this.z = arguments[2];
        }
    };
    /**
     * Modifies the entity's location by the given value
     *
     * If passed an object, will modify by the objects x and y values
     * If passed two numbers will modify the entity's position with the first as delta x and the second as delta y
     */
    RenderedEntity.prototype.modifyLoc = function() {
        if (arguments.length === 0) {
            return;
        } else if (arguments.length === 1) {
            var change = arguments[0];
            this.x += change.x || 0;
            this.y += change.y || 0;
        } else if (arguments.length >= 2) {
            this.x += arguments[0];
            this.y += arguments[1];
        }
    };

    /**
     * Gets the entity's location as a vector
     * @return {Vector} The location of the entity
     */
    RenderedEntity.prototype.getLoc = function() {
        return new Vector(this.x, this.y);
    };

    /**
     * Creates an entity with a bounding box
     * @param {Object} properties The properties to initialize the Bounded Entity with
     *                            {Object}.bounds The bounding box
     *                            {Object}.onCollide(entity) Collision event handler, entity = the entity collided with
     *                            {Object}.bounds  The bounding box
     *                            {Object}.collidesWith An array of strings indicating the collision layers the entity will collide with
     *                            {Object}.collisionLayer A string indicating which collision layer the object lies on
     */
    BoundedEntity = function() {
        RenderedEntity.apply(this, arguments);
    };
    BoundedEntity.prototype = Object.create(RenderedEntity.prototype);
    BoundedEntity.constructor = BoundedEntity;

    /**
     * Performs a single logic tick, checking if the BoundedEntity is capable of colliding with other Entities, and
     * checking if it is colliding with them
     * @param  {Number} deltaTime The elapsed time since the last logic tick
     * @fires Entity#onCollide(entity)
     */
    BoundedEntity.prototype.step = function(deltaTime) {
        if (!(this.canCollide() && this.hasCollisionListener())) {
            return;
        }
        var entities = instance.getEntities();
        for (var i = 0; i < entities.length; ++i) {
            if (!(entities[i] instanceof PhysicsEntity) && entities[i] instanceof BoundedEntity && entities[i].canCollide() &&
                    this.isCollidingWith(entities[i])) {
                if (this.hasCollisionListener()) {
                    this.onCollide(entities[i]);
                }
            }
        }
    };

    /**
     * Forces a collision check with all non-physics Entities. This is for checking if collisions occured between
     * non physics entities between frames due to multisampling. It will send the onCollide event if any collisions occur.
     */
    BoundedEntity.prototype.forceNonPhysicsCollisionCheck = function() {
        var entities = instance.getEntities();
        var collidedTracker = [];
        for (var i = 0; i < entities.length; ++i) {
            if (collidedTracker.indexOf(entities[i]) !== -1) {
                continue;
            }
            if (!(entities[i] instanceof PhysicsEntity) && entities[i] instanceof BoundedEntity && entities[i].canCollide() &&
                this.isCollidingWith(entities[i])) {
                collidedTracker.push(entities[i]);
            }
        }
        return collidedTracker;
    };

    /**
     * Gets if the entity is currently colliding with anything
     * @return {Boolean} If the entity is currently colliding with anything
     */
    BoundedEntity.prototype.isColliding = function() {
        if (!(this.canCollide())) {
            return;
        }
        var entities = instance.getEntities();
        for (var i = 0; i < entities.length; ++i) {
            if (entities[i] instanceof BoundedEntity && entities[i].canCollide() && this.isCollidingWith(entities[i])) {
                return true;
            }
        }
        return false;
    }

    /**
     * If the entity supports collision
     * @return {Boolean} If the entity supports collision
     */
    BoundedEntity.prototype.canCollide = function() {
        if (this.collisionLayer == null || this.collisionLayer === '' || this.collidesWith == null || this.collidesWith.length === 0 ||
            this.bounds == null) {
            return false;
        }
        return true;
    };
    /**
     * If the entity has a collision listener
     * @return {Boolean} If the entitiy has a collision listener
     */
    BoundedEntity.prototype.hasCollisionListener = function() {
        if (this.onCollide == null) {
            return false;
        }
        return true;
    }
    /**
     * Checks if the entity is colliding with the specified entity
     * @param  {BoundedEntity}  entity The entity to check for collision with
     * @return {Boolean}        If the two entities are colliding
     */
    BoundedEntity.prototype.isCollidingWith = function(entity) {
        if (entity === this || !(entity instanceof BoundedEntity) || !entity.canCollide()) {
            return false;
        }
        if (entity.collidesWith.indexOf(this.collisionLayer) !== -1 && this.collidesWith.indexOf(entity.collisionLayer) !== -1 &&
            this.bounds.collidesWith(entity.bounds)) {
            return true;
        }
        return false;
    };

    BoundedEntity.prototype.isOnCollisionLayer = function(layer) {
        return (layer.indexOf(this.collisionLayer) !== -1);
    }

    /**
     * Creates an entity with basic 2-D physics that uses a Force impulse resolution model
     * @param {Object} properties The properties to initialize the RenderedEntity with, can use
     * any BoundedEntity properties
     *                            From RenderedEntity
     *                            {Object}.x  The x location
     *                            {Object}.y  The y location
     *                            {Object}.z  The z index
     *
     *                            From BoundedEntity
     *                            {Object}.bounds The bounding box
     *                            {Object}.onCollide(entity) Collision event handler, entity = the entity collided with
     *                            {Object}.collidesWith An array of strings indicating the collision layers the entity will collide with
     *                            {Object}.collisionLayer A string indicating which collision layer the object lies on
     *
     *                            {Object}.vx  The x velocity
     *                            {Object}.vy  The y velocity
     *                            {Object}.enableCollisionResponse
     *                            {Object}.mass
     *                            {Object}.restitution
     *                            {Object}.friction
     */
    PhysicsEntity = function() {
        BoundedEntity.apply(this, arguments);
        if (this.mass != null) {
            if (this.mass === 0) {
                this.invMass = 0;
            } else {
                this.invMass = 1 / this.mass;
            }
        }
        this.mass = this.mass || 0;
        if (!('restitution' in this)) {
            this.restitution = 1;
        }
        this.friction = this.friction || 0;
        this.vx = this.vx || 0;
        this.vy = this.vy || 0;
    };
    PhysicsEntity.prototype = Object.create(BoundedEntity.prototype);
    PhysicsEntity.prototype.constructor = PhysicsEntity;

    /**
     * Runs a single logic tick, preforming physics operations for the object, and modifying its position accordingly
     * @param  {number} deltaTime The elapsed time since the last logic tick
     */
    PhysicsEntity.prototype.step = function(deltaTime) {
        // Call the superclasses step function
        // Decreate velocity based on friction
        var dt = deltaTime;
        this.vx -= this.vx * this.friction * deltaTime;
        this.vy -= this.vy * this.friction * deltaTime;

        var totalDist = this.getVelocity().getMagnitude() * deltaTime;
        var elapsed = 0;
        // Perform physics, and collision logic
        var entities = instance.getEntities();
        var alertOfCollision = [];
        while (elapsed < deltaTime) {
            var temp = this.forceNonPhysicsCollisionCheck();
            for (var i = 0; i < temp.length; ++i) {
                if (alertOfCollision.indexOf(temp[i]) === -1) {
                    alertOfCollision.push(temp[i]);
                }
            }
            for (var i = 0; i < alertOfCollision.length; ++i) {
                if (this.hasCollisionListener()) {
                    this.onCollide(alertOfCollision[i]);
                }
                if (this.destroyed) {
                    return;
                }
                if (alertOfCollision[i].hasCollisionListener()) {
                    alertOfCollision[i].onCollide(this);
                }
                if (this.destroyed) {
                    return;
                }
            }
            if (this.enableCollisionResponse) {
                for (var i = 0; i < instance.getEntities().length; ++i) {
                    if (entities[i] instanceof PhysicsEntity && entities[i].enableCollisionResponse) {
                        var resolved = Collision.checkAndResolveCollision(this, entities[i]);

                        if (resolved == null) {
                            continue;
                        }
                        this.x = resolved.e1.x;
                        this.vx = resolved.e1.vx;
                        this.y = resolved.e1.y;
                        this.vy = resolved.e1.vy;
                        entities[i].x = resolved.e2.x;
                        entities[i].vx = resolved.e2.vx;
                        entities[i].y = resolved.e2.y;
                        entities[i].vy = resolved.e2.vy;
                        if (this.hasCollisionListener()) {
                            this.onCollide(entities[i]);
                        }
                        if (entities[i].hasCollisionListener()) {
                            entities[i].onCollide(this);
                        }
                    }
                }
            }
            var stepTime = deltaTime;
            if (this.vx === 0 && this.vy === 0) {
                break;
            }
            if (this.multiSample) {
                if (this.bounds instanceof BoundingBox.Circle) {
                    stepTime = Math.min(this.bounds.radius / this.getVelocity().getMagnitude(), deltaTime - elapsed);
                } else {
                    var stepx = Math.min(this.bounds.width / this.vx, deltaTime - elapsed);
                    var stepy = Math.min(this.bounds.height / this.vy, deltaTime - elapsed);
                    stepTime = Math.min(stepx, stepy);
                }

            }
            // Update the entities position based on its velocity
            this.x += this.vx * stepTime;
            this.y += this.vy * stepTime;
            elapsed += stepTime;
        }
    };

    /**
     * Gets the PhysicsEntity's velocity as a vector
     * @return {Vector} The PhysicsEntity's velocity
     */
    PhysicsEntity.prototype.getVelocity = function() {
        return new Vector(this.vx, this.vy);
    };
    /**
     * Sets the PhysicsEntitiy's velocity as a vector
     * @param {Vector} v The new velocity
     */
    PhysicsEntity.prototype.setVelocity = function(v) {
        this.vx = v.x;
        this.vy = v.y;
    };

    /**
     * Modifies the velocity of an object by the given values
     *
     * If passed a single object, will modify the x and y velicities by the amount given in {Object}.x and {Object}.y
     * If passed two arguments, will use on as the change in  x velocity, and one as the y velocity
     */
    PhysicsEntity.prototype.applyAcceleration = function() {
        if (arguments.length === 0) {
            return;
        }
        if (arguments.length === 1) {
            this.vx += arguments[0].x || 0;
            this.vy += arguments[0].y || 0;
        } else if (arguments.length >= 2) {
            this.vx += arguments[0];
            this.vy += arguments[1];
        }
    };

    /**
     * Sets the objects mass, and conserves linear momentum. If the original mass was infinite, velocity will not be affected
     * @param {[type]} mass [description]
     */
    PhysicsEntity.prototype.setMassAndConserve = function(mass) {
        if (this.mass === mass) {
            return;
        }
        if (this.mass === 0) {
            this.setMass(mass);
            return;
        }
        if (mass === 0) {
            this.setMass(mass);
            this.vx = 0;
            this.vy = 0;
        }
        var pX = this.mass * this.vx;
        var pY = this.mass * this.vy;
        this.setMass(mass);
        this.vx = pX / this.mass;
        this.vy = pY / this.mass;
    };

    /**
     * Sets the objects mass, the objects other properties are not affected
     * To conservere momentum with the addition of mass, use setMassAndConserve(mass)
     * @param {Number} mass The objects new mass
     */
    PhysicsEntity.prototype.setMass = function(mass) {
        if (this.mass === mass) {
            return;
        }
        this.mass = mass;
        this.invMass = (mass === 0 ? 0 : 1 / mass);
    };

})();
