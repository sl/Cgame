function Game(prefs) {
	Game.instance = this;
	var prefKeys = Object.hasOwnPropertyNames(prefs);
	// Copy all properties of preferences
	for (var i = 0; i < prefKeys.length; ++i) {
		this[prefKeys[i]] = prefs[prefKeys[i]]
	}
	this.entities = [];
	if (!this.hasOwnProperty('timeScale')) {
		//Sets the default time scale, defaults to 1 real second per second of time change
		this.timeScale = 1;
	}
	if (!this.hasOwnProperty('updateRate')) {
		//Sets the default rate of update
		this.updateRate = 20;
	}
	var paused = false;
	var updating = true;
	var lastTime = null;
	this.shouldContinueUpdateCycle = function() {
		return updating;
	}
	this.startUpdating = function() {
		updating = true;
		Game.instance.update();
	}
	this.stopUpdating = function() {
		updating = false;
	}
	this.pause = function() {
		for (var i = 0; i < Game.instance.entities.length; ++i) {
			if (Game.instance.entities[i].hasOwnProperty('onPause')) {
				Game.instance.entities[i].onPause();
			}
		}
		paused = true;
	}
	this.unpause = function() {
		for (var i = 0; i < Game.instance.entities.length; ++i) {
			if (Game.instance.entities[i].hasOwnProperty('onUnpause')) {
				Game.instance.entities[i].onUnpause();
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
}

Game.prototype.setupCanvas = function() {
	var canvas = document.getElementById(this.canvasId);
	this.context = canvas.getContext('2d');

}

Game.prototype.update = function() {
	if (!this.isPaused()) {
		// Perform step call
		this.step(this.getDeltaTime() / this.timeScale);
	}
	//Reschedule next update at end
	if (Game.instance.shouldContinueUpdateCycle()) {
		setTimeout(this.update, this.updateRate);
	}
}

Game.prototype.step = function(deltaTime) {

}

Game.prototype.render = function(c) {

}

function Entity() {}

Entity.prototype.create = function() {
	Game.instance.entities.push(this);
	return this;
}

Entity.prototype.destroy = function() {
	Game.instance.entities.splice(Game.instance.entities.indexOf(this), 1);
	return this;
}

Entity.prototype.step = function() {

}