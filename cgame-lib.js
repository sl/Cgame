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
    }

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
                    game.canvas.width = window.innerWidth();
                    game.canvas.height = window.innerHeight();
                    var s = Math.min(game.canvas.height / game.prefs.lockAspectRatioSize.height, game.canvas.width / game.prefs.lockAspectRatioSize.width);
                    game.context.translate(game.canvas.width / 2 | 0, game.canvas.height / 2 | |0);
                    game.context.scale(s, -s);
                    game.context.beginPath();
                    game.context.rect(-game.prefs.lockAspectRatioSize.width / 2, -game.prefs.lockAspectRatioSize.height / 2, game.prefs.lockAspectRatioSize.width,
                        game.prefs.lockAspectRatioSize.height);
                    game.context.clip();
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
                }
            }
        };
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
            this.update();
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
                if (entities[i].hasOwnProperty('onPause')) {
                    entities[i].onPause();
                }
            }
        };
        /**
         * Unpauses the game, resuming logic tics on all entities
         * @fires Entity#onUnpause
         */
        this.unpause = function() {
            for (var i = 0; i < entities.length; ++i) {
                if (entities[i].hasOwnProperty('onUnpause')) {
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
            return (+new Date()) - lastTime;
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
            if (foregroundEntity.hasOwnProperty('onResignForegroundRequest')) {
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
                if (entities[i].hasOwnProperty('onForegroundAvailable')) {
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
            if (backgroundEntity.hasOwnProperty('onResignBackgroundRequest')) {
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
                if (entities[i].hasOwnProperty('onBackgroundAvailable')) {
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
            entities.sort(function(a, b) {
                if (a.hasOwnProperty('z') && b.hasOwnProperty('z')) {
                    return (a.z - b.z);
                } else if (a.hasOwnProperty('z')) {
                    return 1;
                } else if (b.hasOwnProperty('z')) {
                    return -1;
                } else {
                    return 0;
                }
            });
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
            instance.canvas = document.getElementById(instance.canvasId);
            if (!(instance.canvas instanceof HTMLCanvasElement) {
                throw new PreferenceException('canvasId', 'ID did point to a valid HTML canvas element');
            }
            instance.context = instance.canvas.getContext('2d');
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
            instance.context.restore();
            // Schedule the next update with the DOM
            if (p[id(instance)].shouldContinueUpdateCycle()) {
                setTimeout(p[id(instance)].update, instance.prefs.updateInterval);
            }
        };
        /**
         * Runs a single logic tick
         * @param  {Number} deltaTime The time elapsed since the last logic tick
         */
        p[id(this)].step = function(deltaTime) {
            for (var i = 0; i < entities.length; ++i) {
                if (entities[i].hasOwnProperty('step')) {
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
            if (backgroundEntity !== null && backgroundEntity.hasOwnProperty('render')) {
                c.save();
                backgroundEntity.render(c);
                c.restore();
            }
            // Sort the entities based on their z indexes so they can be rendered in the correct order.
            p[id(instance)].sortEntitiesByZIndex();
            // Render all of the entities excluding the background and foreground entities
            for (var i = 0; i < entities.length; ++i) {
                if (entities[i] !== backgroundEntity && entities[i] !== foregroundEntity) {
                    c.save();
                    entities[i].render(c);
                    c.restore();
                }
            }
            // Render the foreground entity
            if (foregroundEntity !== null && foregroundEntity.hasOwnProperty('render')) {
                c.save();
                foregroundEntity.render(c);
                c.restore();
            }
        };


        /**
         * Represents a game object that can be updated, and drawn. In most cases, Entity should be
         * inherited from rather than instanced
         * @param {Object} props the properties of the entity
         */
        Entity = function(props) {
            var prefKeys = Object.getOwnPropertyNames(props);
            // Copy all properties of the props object
            for (var i = 0; i < prefKeys.length; ++i) {
                this[prefKeys[i]] = prefs[prefKeys[i]];
            }
        };
        /**
         * Creates the entity, puting it under the main game instance's management
         */
        Entity.prototype.create = function() {
            p[id(instance)].addEntity(this);
        };
        /**
         * Destroys the entity, removing it from the main game instance's management
         */
        Entity.prototype.destroy = function() {
            p[id(instance)].removeEntity(this);
        };

        RenderedEntity = function() {
            Entity.apply(this, arguments);
        }
        RenderedEntity.prototype = Entity;
        RenderedEntity.prototype.constructor = RenderedEntity;

        /**
         * Requests control of the foreground
         * @return {Boolean} If the entity successfully took control of the foreground
         */
        RenderedEntity.prototype.requestForeground = function() {
            if (!this.hasOwnProperty('render')) {
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
            if (!this.hasOwnProperty('render')) {
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
        }

        /**
         * Sets the RenderedEntity's x position
         * @param {Number} x The new x position
         */
        RenderedEntity.prototype.setX = function(x) {
            this.x = x;
        }
        /**
         * Sets the RenderedEntity's y position
         * @param {Number} y The new y position
         */
        RenderedEntity.prototype.setY = function(y) {
            this.y = y;
        }
        /**
         * Sets the RenderedEntity's z index
         * @param {Number} z The new z index
         */
        RenderedEntity.prototype.setZ = function(z) {
            this.z = z;
        }
        /**
         * Gets the RenderedEntity's x position
         */
        RenderedEntity.prototype.getX = function() {
            return this.x;
        }
        /**
         * Gets the RenderedEntity's y position
         */
        RenderedEntity.prototype.getY = function() {
            return this.y;
        }
        /**
         * Gets the RenderedEntity's z index
         */
        RenderedEntity.prototype.getZ = function() {
            return this.z;
        }
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

        // TODO: Physics
    };


})();
