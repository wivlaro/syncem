(function(syncem) {

syncem.registry = {};

var coreRegistrations = true;
syncem.registerClass = function(name, ctor) {
	syncem.registry[name] = ctor;
	ctor._SYNC_TYPE_ = name;
	if (coreRegistrations) {
		syncem[name] = ctor;
	}
};

syncem.uniqSeed = new Date().getTime().toString(16) + '-' + ((Math.random() * 0x1000000)|0).toString(16);
syncem.uniqSeq = 0;

syncem.makeUid = function() {
	return syncem.uniqSeed + '-' + syncem.uniqSeq++;
};

syncem.registerClass('SyncOb', function () {
	//Make it an actual field so that JSON serialises it
	this.type = this.constructor._SYNC_TYPE_;
	this.syncData = {};
	
	this.update = function() {
	};
});

syncem.create = function(input) {
	var obj = new syncem.registry[input.type]();
	obj.syncData = syncem.copyFields(obj.syncData || {}, input.syncData || {});
	return obj;
};

syncem.copyOffset = function(dst, src, key) {
	var src_value = src[key];
	switch (typeof src_value) {
		case 'function':
			//Ignore methods.
			break;
		case 'undefined':
		case 'boolean':
		case 'string':
		case 'number':
			//Copy the immutable primitives
			dst[key] = src_value;
			break;
		case 'object':
			dst[key] = syncem.copyObject(dst[key], src_value);
			break;
		default:
			throw "Unrecognised type: " + typeof src_value;
	}
};

syncem.copyArray = function(dst_array, src_array) {
	if (!Array.isArray(dst_array)) {
		dst_array = [];
	}
	dst_array.length = src_array.length;
	for (var index = 0 ; index < src_array.length; index++) {
		syncem.copyOffset(dst_array, src_array, index);
	}
	return dst_array;
}

syncem.copyFields = function(dst, src) {
	if (dst == null) {
		dst = {};
	}
	var fieldName;
	for (fieldName in src) {
		syncem.copyOffset(dst, src, fieldName)
	}
	for (fieldName in dst) {
		if (!(fieldName in src)) {
			delete dst[fieldName];
		}
	}
	return dst;
}

syncem.copyObject = function(dst, src) {
//	console.trace();
	if (src === null) {
		dst = null;
	}
	else if (Array.isArray(src)) {
		dst = syncem.copyArray(dst, src);
	}
	else if ('type' in src && 'syncData' in src) {
		if (dst != null && dst.constructor === syncem.registry[src.type]) {
			dst.syncData = syncem.copyFields(dst.syncData, src.syncData);
		}
		else {
			dst = syncem.create(src);
		}
	}
	else {
		dst = syncem.copyFields(dst, src);
	}
	return dst;
};

syncem.registerClass('SyncMove', function (tick, id) {
	syncem.SyncOb.call(this);
	
	this.syncData.id = id || syncem.makeUid();
	this.syncData.tick = tick;
	
	this.checkValid = function(state) {
		return true;
	}
	
	this.apply = function(state) {
	};
});

syncem.registerClass('SyncObjectMove', function (objectId) {
	syncem.SyncMove.call(this);
	
	this.syncData.objectId = objectId;
	
	this.checkValid = function(state) {
		return this.syncData.objectId in state.syncData.objects;
	};
	
	this.apply = function(state) {
		if (this.syncData.objectId in state.syncData.objects) {
			this.applyTo(state.syncData.objects[this.syncData.objectId]);
		}
		else {
			console.warn("Failed to apply move, couldn't find ", this.syncData.objectId);
		}
	};
	
	this.applyTo = function(object) {
		throw "Unimplemented applyTo";
	};
});

syncem.registerClass('ObjectAddedMove', function (object) {
	syncem.SyncObjectMove.call(this, object && object.syncData.id);
	
	this.syncData.object = object;
	
	this.apply = function(state) {
		state.syncData.objects[this.syncData.object.syncData.id] = this.syncData.object;
	};
});

syncem.registerClass('ObjectRemovedMove', function (objectId) {
	syncem.SyncObjectMove.call(this, objectId);
	
	this.apply = function(state) {
		console.log("Applying ObjectRemovedMove for ", this.syncData.objectId);
		delete state.syncData.objects[this.syncData.objectId];
	};
});

syncem.registerClass('SyncRoot', function () {
	syncem.SyncOb.call(this);
	
	this.syncData.tick = 0;
	this.syncData.moves = {};
	this.syncData.objects = {};
	
	this.update = function() {
		for (var moveId in this.syncData.moves) {
			console.log("Applying move at ", this.syncData.tick, ": ", this.syncData.moves[moveId]);
			this.syncData.moves[moveId].apply(this);
		}
		for (var objId in this.syncData.objects) {
			this.syncData.objects[objId].update();
		}
	};
});

syncem.Syncer = function (config) {
	config = config || {};
	if (config.lps == null) {
		config.lps = 10;
	}
	if (config.history_size == null) {
		config.history_size = config.lps;
	}
	
	this.config = config;
	this.tick = 0;
	this.dirty_tick = 0;
	this.states = [];
	this.start_time = null;
	this.interval = null;
	this.queuedMoves = {};
	
	this.start = function(state, tick) {
		if (state == null) {
			state = new syncem.SyncRoot();
		}
		if (tick == null) {
			tick = 0;
		}
		this.tick = tick;
		this.states[tick % this.config.history_size] = state;
		this.start_time = new Date().getTime();
		this.startInterval();
	};
	
	this.startInterval = function() {
		var syncer = this;
		console.log("startInterval with time ", new Date(syncer.start_time));
		this.interval = setInterval(function() {
			syncer.update();
		}, 1000 / this.config.lps);
	};
	
	this.stop = function() {
		if (this.interval) {
			clearInterval(this.interval);
			this.interval = null;
		}
	};

	this.addMove = function(move) {
		var now_tick = this.getNowTick();
		var valid = move.syncData.tick > this.getOldestTick() && move.syncData.tick <= now_tick;
		console.log("addMove valid tick range:",this.getOldestTick(),"->",now_tick,":",move);
		if (valid) {
			if (move.syncData.tick >= now_tick) {
				if (!(move.syncData.tick in this.queuedMoves)) {
					this.queuedMoves[move.syncData.tick] = {};
				}
				console.log("Enqueued move ", move);
				this.queuedMoves[move.syncData.tick][move.syncData.id] = move;
			}
			else {
				this.getState(move.syncData.tick).syncData.moves[move.syncData.id] = move;
			}
			if (move.syncData.tick <= this.dirty_tick) {
				this.dirty_tick = move.syncData.tick - 1;
			}
		}
		return valid;
	};
	
	this.getNowTick = function() {
		var now = new Date().getTime();
		return (now - this.start_time) * this.config.lps / 1000;
	}
	
	this.update = function() {
		var now = new Date().getTime();
		var now_tick = this.getNowTick();
		while (this.dirty_tick < now_tick) {
			var prev_tick = this.dirty_tick++;
			
//			console.log("copying ", prev_tick, " into ", this.dirty_tick);
			var prev_index = prev_tick % this.config.history_size;
			var next_index = this.dirty_tick % this.config.history_size;
			
			var prev_state = this.states[prev_index];
			var next_state = this.states[next_index];
			
			//Fresh state?
			if (next_state == null) {
				next_state = this.states[next_index] = syncem.create(this.states[prev_index]);
				next_state.syncData.moves = {};
				next_state.syncData.tick = this.dirty_tick;
			}
			//Recycled old state?
			else if (next_state.syncData.tick != this.dirty_tick) {
				//clear out old invalid moves
				next_state.syncData.moves = {};
				next_state.syncData.tick = this.dirty_tick;
			}
			//Wipe the moves out from the fresh copy
			if (this.dirty_tick in this.queuedMoves) {
				console.log("Enqueued moves ", this.dirty_tick);
				next_state.syncData.moves = this.queuedMoves[this.dirty_tick];
				delete this.queuedMoves[this.dirty_tick];
			}
			
			//Only copy the objects, not the moves
			next_state.syncData.objects = syncem.copyObject(next_state.syncData.objects, prev_state.syncData.objects);
			next_state.update();
			if (this.tick < this.dirty_tick) {
				this.tick = this.dirty_tick;
			}
		}
	};
	
	this.getOldestTick = function() {
		return Math.max(0, this.tick - config.history_size + 1);
	}
	
	this.getState = function(tick) {
		if (tick == null) {
			tick = this.tick;
		}
		var state = null;
		if (tick >= this.getOldestTick() && tick <= this.tick) {
			state = this.states[tick % this.config.history_size];
		}
		return state;
	}
	
	this.getSetup = function() {
		var oldest_tick = this.getOldestTick();
		return {
			config:this.config,
			oldest_tick:oldest_tick,
			oldest_state:this.states[oldest_tick % this.config.history_size],
			current_tick:this.getNowTick(),
			user_id:syncem.makeUid()
		};
	};
}

syncem.Syncer.createFromSetup = function(setup) {
	var syncer = new syncem.Syncer(setup.config);
	syncer.dirty_tick = setup.oldest_tick;
	syncer.tick = setup.current_tick;
	syncer.states[syncer.dirty_tick % syncer.config.history_size] = syncem.create(setup.oldest_state);
	syncer.start_time = new Date().getTime() - setup.current_tick * 1000 / syncer.config.lps;
	syncer.update();
	syncer.startInterval();
	return syncer;
};

coreRegistrations = false;
})(typeof exports === 'undefined'? this['syncem']={}: exports);

