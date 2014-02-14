
// Utility Functions

/**
 * Gets one of the provided canvas arangements.
 * @return {Function} A method that applies the arangement.
 */
function getCanvasArangements() {
	return {
		/**
		 * Arranges the canvas so that is maintains the aspect ratio specfied in the preferences lockAspectRatio.width
		 * and lockAspectRatio.height
		 * @param  {Game} game The main game instance
		 * @throws {PreferenceException} If The lockAspectRatioSize.width or lockAspectRatioSize.height preferences are
		 * missing or invalid.
		 */
		lockAspectRatio: function(game) {
			if (game.hasOwnProperty('lockAspectRatioSize')) {
				if (!(game.lockAspectRatioSize.hasOwnProperty('width') && game.lockAspectRatioSize.hasOwnProperty('height'))) {
					throw 'Specified lockAspectRatioSize, but lockAspectRatioSize did not contain both a width and height property';
				}
				game.canvas.width = window.innerWidth();
				game.canvas.height = window.innerHeight();
				var s = Math.min(game.canvas.height / game.lockAspectRatioSize.height, game.canvas.width / game.lockAspectRatioSize.width);
				game.context.translate(game.canvas.width / 2 | 0, game.canvas.height / 2 | |0);
				game.context.scale(s, -s);
				game.context.beginPath();
				game.context.rect(-game.lockAspectRatioSize.width / 2, -game.lockAspectRatioSize.height / 2, game.lockAspectRatioSize.width,
					game.lockAspectRatioSize.height);
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
			if (game.hasOwnProperty('fixedSizeArangementSize')) {
				if (!(game.fixedSizeArangementSize.hasOwnProperty('width') && game.fixedSizeArangementSize.hasOwnProperty('height'))) {
					throw new PreferenceException('fixedSizeArangementSize',
						'Specified fixedSizeArangementSize, but fixedSizeArangementSize did not contain both a width and height property');
				}
				game.canvas.width = game.fixedSizeArangementSize.width;
				game.canvas.height = game.fixedSizeArangementSize.height;
			}
		}
	};
}

// Class Definitions

/**
 * Creates an instance of a Canvas Game Library Game
 *
 * @param {Object} prefs The preferences used in creating the game
 */
function Game(prefs) {
	/**
	 * The main Game instance, this will be set to the last created instance of game, and should be used
	 * for referencing the game instance from the library only
	 * @type {Game}
	 */
	Game.instance = this;
	var prefKeys = Object.hasOwnPropertyNames(prefs);
	// Copy all properties of preferences
	for (var i = 0; i < prefKeys.length; ++i) {
		this[prefKeys[i]] = prefs[prefKeys[i]]
	}
	var entities = [];
	var foregroundEntity = null;
	var backgroundEntity = null;
	if (!this.hasOwnProperty('timeScale')) {
		//Sets the default time scale, defaults to 1 real second per second of time change
		this.timeScale = 1;
	}
	if (!this.hasOwnProperty('updateRate')) {
		//Sets the default rate of update
		this.updateRate = 20;
	}
	if (!this.hasOwnProperty('canvasArangement')) {
		this.canvasArangement = getCanvasArangements().fixedSize;
	}
	var paused = false;
	var updating = true;
	var lastTime = null;
	/**
	 * If the update cycle should continue registering updates with the DOM scheduler
	 *
	 * @return {Boolean} If the update cycle should continue registering updates with the DOM scheduler
	 */
	this.shouldContinueUpdateCycle = function() {
		return updating;
	}
	/**
	 * Starts the updating cycle
	 */
	this.startUpdating = function() {
		updating = true;
		Game.instance.update();
	}
	/**
	 * Stops the updating cycle
	 */
	this.stopUpdating = function() {
		updating = false;
	}
	/**
	 * Stops calling the step function on all entities except those that have stepWhenPaused = true
	 *
	 * @fires Entity#onPause
	 */
	this.pause = function() {
		for (var i = 0; i < entities.length; ++i) {
			if (entities[i].hasOwnProperty('onPause')) {
				entities[i].onPause();
			}
		}
		paused = true;
	}
	/**
	 * Unpauses the game, resuming the calling of the step function on all entities
	 *
	 * @fires Entity#onUnpause
	 */
	this.unpause = function() {
		for (var i = 0; i < entities.length; ++i) {
			if (entities[i].hasOwnProperty('onUnpause')) {
				entities[i].onUnpause();
			}
		}
		paused = false;
	}
	/**
	 * If the game is paused
	 * @return {Boolean} If the game is paused
	 */
	this.isPaused = function() {
		return paused;
	}
	/**
	 * Gets the amount of time elapsed since the last step
	 * @return {Number} The amount of time elapsed since the last step
	 */
	this.getDeltaTime = function() {
		if (lastTime === null) {
			lastTime = +new Date();
			return 0;
		}
		return (+new Date()) - lastTime;
	}
	/**
	 * Get the entitiy that has control of the foreground
	 * @return {Entity} The foreground Entity, or null if there is no Entity with control of the foreground
	 */
	this.getForegroundEntity = function() {
		return foregroundEntity;
	}
	/**
	 * Request that an Entity take control of the foreground
	 * @param  {Entity} entity The Entity requesting control of the foreground
	 * @fires Entity#onResignForegroundRequest
	 * @return {Boolean} If the Entity successfully took control of the foreground
	 */
	this.requestForeground = function(entity) {
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
	}
	/**
	 * Resigns the foreground. Should only be called by the entity with control of the foreground
	 * @param  {Entity} resigner The Entity attempting to resign control of the foreground. Must be the Entity
	 *                           that currently has foreground control or the function will do nothing
	 * @fires Entity#onForegroundAvailable
	 * @return {Entity} The entity that took control of the foreground from the resigner, or null if no Entity requested
	 * to take control.
	 */
	this.resignForeground = function(resigner) {
		if (resigner !== foregroundEntity) {
			return null;
		}
		foregroundEntity = null;
		for (var i = 0; i < entities.length; ++i) {
			if (entities[i].hasOwnProperty('onForegroundAvailable')) {
				if (entities[i].onForegroundAvailable()) {
					Game.instance.requestForeground(entities[i]);
					return entities[i];
				}
			}
		}
		return null;
	}
	/**
	 * Get the entity that has control of the background
	 * @return {Entity} The background entity, or null if there is no entity with control of the background
	 */
	this.getBackgroundEntity = function() {
		return backgroundEntity;
	}
	/**
	 * Requests that an entity take control of the background
	 * @param  {Entity} entity The entity requesting control of the background
	 * @fires Entity#onResignBackgroundRequest
	 * @return {Boolean} If the entity successfully took control of the background
	 */
	this.requestBackground = function(entity) {
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
	}
	/**
	 * Resigns the background. Should be called by the entity with control of the background
	 * @param  {Entity} resigner The entity attempting to resign control of the background, must be the entity
	 *                           that currently has background control or the function will do nothing
	 * @fires Entity#onBackgroundAvailable
	 * @return {Entity} The entity that took control of the foreground from the resigner, or null if no Entity requested
	 * to take control
	 */
	this.resignBackground = function(resigner) {
		if (resigner !== backgroundEntity) {
			return null;
		}
		backgroundEntity = null;
		for (var i = 0; i < entities.length; ++i) {
			if (entities[i].hasOwnProperty('onBackgroundAvailable')) {
				if (entities[i].onBackgroundAvailable()) {
					Game.instance.requestBackground(entities[i]);
					return entities[i];
				}
			}
		}
		return null;
	}
	/**
	 * Gets an array containing all entities currently registered with the game
	 * @return {Array} The array of entities
	 */
	this.getEntities = function() {
		return entities;
	}
	/**
	 * Sorts the list of all entities from low to high by their z index values
	 */
	this.sortEntitiesByZIndex = function() {
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
	}
	/**
	 * Adds an entity to this list of managed entities, this should be called by Entity.create
	 * @param {Entity} entity The entity to add
	 */
	this.addEntity = function(entity) {
		entities.push(entity);
		return entity;
	}
	/**
	 * Removes an entity from the list of managed entities, this should be called by Entity.destroy
	 * @param  {Entity} entity The entity to remove
	 * @return {Entity} A copy of the entity removed
	 */
	this.removeEntity = function(entity) {
		entities.splice(entities.indexOf(entity), 1);
		return entity;
	}
}

/**
 * Sets up the game's canvas
 */
Game.prototype.setupCanvas = function() {
	this.canvas = document.getElementById(this.canvasId);
	this.context = this.canvas.getContext('2d');
}

/**
 * Runs a logic tick, and draws the game to the canvas
 *
 * Will register itself with the DOM scheduler to run prefs.updateRate milliseconds in the future
 * while shouldContinueUpdateCycle() is true
 */
Game.prototype.update = function() {
	//Run a game tick
	this.step(this.getDeltaTime() / this.timeScale);
	//Update the canvas position, size, and translation
	this.context.save();
	this.canvasArangement(this);
	//Render everything once the canvas has been transformed
	this.render(this.context);
	//Restore the context
	this.context.restore();
	//Reschedule next update at end
	if (Game.instance.shouldContinueUpdateCycle()) {
		setTimeout(this.update, this.updateRate);
	}
}
/**
 * Causes a single logic tick in which every entity's step function is called unless the game is paused
 * in which case a logic tick will occur for only entities with Entity.stepWhenPaused = true
 * @param  {Number} deltaTime The time elapsed since the last logic tick
 */
Game.prototype.step = function(deltaTime) {
	for (var i = 0; i < this.getEntities().length; ++i) {
		if (this.getEntities()[i].hasOwnProperty('step')) {
			if (!this.isPaused() || this.getEntities[i].stepWhenPaused) {
				this.getEntities()[i].step(deltaTime);
			}
		}
	}
}
/**
 * Draws the game to the canvas, this calls the render function of every entity starting with the
 * entity with control of the background, then the rest of the entities in order of z index, and finally
 * the entity with control of the foreground
 * @param  {RenderingContext} c The canvas' rendering context
 */
Game.prototype.render = function(c) {
	//Render the background entity
	if (this.getBackgroundEntity() !== null && this.getBackgroundEntity().hasOwnProperty('render')) {
		c.save();
		this.getBackgroundEntity().render(c);
		c.restore();
	}
	//Sort the entities based on their z indexs so they can be rendered in the correct order.
	this.sortEntitiesByZIndex();
	for (var i = 0; i < this.getEntities().length; ++i) {
		if (this.getEntities()[i] !== this.getBackgroundEntity() && this.getEntities()[i] !== this.getForegroundEntity()) {
			c.save();
			this.getEntities()[i].render(c);
			c.restore();
		}
	}
	//Render the foreground entity
	if (this.getForegroundEntity() !== null && this.getForegroundEntity().hasOwnProperty('render')) {
		c.save();
		this.getForegroundEntity().render(c);
		c.restore();
	}
}

/**
 * Represents a game object that can be updated, and drawn. In most cases, Entity should be
 * inherited from rather than instanced
 */
function Entity(props) {
}

/**
 * Creates the entity, puting it under the main game instance's management
 * @return {Entity} The entity added
 */
Entity.prototype.create = function() {
	Game.instance.addEntity(this);
	return this;
}
/**
 * Destroys an entity, removing it from the main game instance's management
 * @return {Entity} The destroyed entity
 */
Entity.prototype.destroy = function() {
	Game.instance.removeEntity(this);
	return this;
}

RenderedEntity.prototype = new Entity();
RenderedEntity.prototype.constructor = Entity;
/**
 * Represents an entity that is rendered to the game's canvas. In most cases, RenderedEntity
 * should be inherited from rather than instanced
 * @param {Object} props The properties to initialize the RenderedEntity with
 */
function RenderedEntity(props) {

}
/**
 * Requests control of the foreground
 * @return {Boolean} If the entity successfully took control of the foreground
 */
RenderedEntity.prototype.requestForegound = function() {
	if (!this.hasOwnProperty('render')) {
		return;
	}
	return Game.instance.requestForegound(this);
}
/**
 * Resign control of the foreground
 * @return {Boolean} If the entity had foreground control, and successfully resigned it
 */
RenderedEntity.prototype.resignForeground = function() {
	return Game.instance.resignForeground(this);
}
/**
 * Requests control of the background
 * @return {Boolean} If the entity successfully took control of the background
 */
RenderedEntity.prototype.requestBackground = function() {
	if (!this.hasOwnProperty('render')) {
		return;
	}
	return Game.instance.requestBackground(this);
}
/**
 * Resign control of the background
 * @return {Boolean} If the entity had background control, and successfully resigned it
 */
RenderedEntity.prototype.resignBackground = function() {
	return Game.instance.resignBackground(this);
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
 * @return {Number} The RenderedEntity's x position
 */
RenderedEntity.prototype.getX = function() {
	return this.x;
}
/**
 * Gets the RenderedEntity's y position
 * @return {Number} The RenderedEntity's y position
 */
RenderedEntity.prototype.getY = function() {
	return this.y;
}
/**
 * Gets the RenderedEntity's z index
 * @return {Number} The RenderedEntity's z index
 */
RenderedEntity.prototype.getZ = function() {
	return this.z;
}



// Exceptions

/**
 * Thrown to indicate that a preference was missing, or its value was Invalid
 * @param {String} preference The invalid or missing preference
 * @param {String} message The error message
 */
function PreferenceException(preference, message) {
	this.name = 'PreferenceException';
	this.message = 'Invalid value for preference "' + preference + '", ' + message;
}



