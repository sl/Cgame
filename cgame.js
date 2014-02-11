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
		 * @param  {Game} game the main game instance
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
		 * @param  {Game} game the main game instance
		 */
		fillScreen: function(game) {
			game.canvas.width = window.innerWidth();
			game.canvas.height = window.innerHeight();
		},
		/**
		 * Arranges the canvas so that it always stays at the fixed size specified in  the preferences
		 * fixedSizeArangementSize.width, and fixedSizeArangementSize.height
		 * @param  {Game} game the main game instance
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
	 * @return {Boolean}
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
	this.isPaused = function() {
		return paused;
	}
	this.getDeltaTime = function() {
		if (lastTime === null) {
			lastTime = +new Date();
			return 0;
		}
		return (+new Date()) - lastTime;
	}
	this.getForegroundEntity = function() {
		return foregroundEntity;
	}
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
	this.getBackgroundEntity = function() {
		return backgroundEntity;
	}
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
	this.getEntities = function() {
		return entities;
	}
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
	this.addEntity = function(entity) {
		entities.push(entity);
		return entity;
	}
	this.removeEntity = function(entity) {
		entities.splice(entities.indexOf(entity), 1);
		return entity;
	}
}

Game.prototype.setupCanvas = function() {
	this.canvas = document.getElementById(this.canvasId);
	this.context = this.canvas.getContext('2d');
}

Game.prototype.update = function() {
	if (!this.isPaused()) {
		// Perform step call
		this.step(this.getDeltaTime() / this.timeScale);
	}
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

Game.prototype.step = function(deltaTime) {
	for (var i = 0; i < this.getEntities().length; ++i) {
		if (this.getEntities()[i].hasOwnProperty('step')) {
			this.getEntities()[i].step(deltaTime);
		}
	}
}

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

function Entity() {}

Entity.prototype.create = function() {
	Game.instance.addEntity(this);
	return this;
}

Entity.prototype.destroy = function() {
	Game.instance.removeEntity(this);
	return this;
}

RenderedEntity.prototype = new Entity();
RenderedEntity.prototype.constructor = RenderedEntity;
function RenderedEntity(props) {

}

RenderedEntity.prototype.requestForegound = function() {
	if (!this.hasOwnProperty('render')) {
		return;
	}
	return Game.instance.requestForegound(this);
}
RenderedEntity.prototype.resignForeground = function() {
	return Game.instance.resignForeground(this);
}
RenderedEntity.prototype.requestBackground = function() {
	if (!this.hasOwnProperty('render')) {
		return;
	}
	return Game.instance.requestBackground(this);
}
RenderedEntity.prototype.resignBackground = function() {
	return Game.instance.resignBackground(this);
}

RenderedEntity.prototype.setX = function(x) {
	this.x = x;
}
RenderedEntity.prototype.setY = function(y) {
	this.y = y;
}
RenderedEntity.prototype.setZ = function(z) {
	this.z = z;
}


// Exceptions

/**
 * Thrown to indicate that a preference was missing, or its value was Invalid
 * @param {} preference
 * @param {[type]} message
 */
function PreferenceException(preference, message) {
	this.name = 'PreferenceException';
	this.message = 'Invalid value for preference "' + preference + '", ' + message;
}



