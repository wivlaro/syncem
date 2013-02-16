(function(syncem) {

var registrationsByConstructor = {};
var registrationsByIndex = [];

syncem.registerClass = function(config, ctor) {
	if (typeof ctor === 'undefined') {
		ctor = config;
		config = {};
	}
	if (Array.isArray(config)) {
		config = {
			fields: config
		};
	}
	else if (typeof config == 'object') {
		if (config.not) {
			if (Array.isArray(config.not)) {
				var objectNot = {};
				for (var notIndex = 0; notIndex < config.not.length; notIndex++) {
					objectNot[config.not[notIndex]] = true;
				}
				config.not = objectNot;
			}
		}
	}
	config.ctor = ctor;
	config.index = registrationsByIndex.length;
	registrationsByIndex.push(config);
	registrationsByConstructor[ctor] = config;
};

syncem.uniqSeed = new Date().getTime().toString(36) + '-' + ((Math.random() * 60466176)|0).toString(36);
var uniqSeq = 0;

syncem.makeUid = function() {
	return syncem.uniqSeed + '-' + (uniqSeq++).toString(36);
};

syncem.create = function(input) {
	var config = null;
	if (input.constructor in registrationsByConstructor) {
		config = registrationsByConstructor[input.constructor];
	}
	else if (input.constructor in registrationsByIndex) {
		config = registrationsByIndex[input.constructor];
	}
	else {
		throw "Couldn't make anything of " + JSON.stringify(input);
	}
	var obj = new config.ctor();
	copyFields(obj, input);
	return obj;
};

//var indent = '';
function copyOffset(dst, src, key) {
//	console.log(indent + "copying offset: " + key);
//	indent += ' ';
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
			dst[key] = copyObject(dst[key], src_value);
			break;
		default:
			throw "Unrecognised type: " + typeof src_value;
	}
//	indent = indent.substr(0,indent.length - 1);
}

function copyArray(dst_array, src_array) {
	if (!Array.isArray(dst_array)) {
		dst_array = [];
	}
	dst_array.length = src_array.length;
	for (var index = 0 ; index < src_array.length; index++) {
		copyOffset(dst_array, src_array, index);
	}
	return dst_array;
}

function copyFieldsWithConfig(dst, src, config) {
	if (config.fields) {
		for (var fieldIndex = 0; fieldIndex < config.fields.length; fieldIndex++) {
			var fieldName = config.fields[fieldIndex];
			if (fieldName in src) {
				copyOffset(dst, src, fieldName);
			}
			else {
				delete dst[fieldName];
			}
		}
	}
	else if (config.not) {
		copyFieldsExcluding(dst, src, config.not);
	}
	else {
		copyFields(dst, src);
	}
}

function copyFieldsExcluding(dst, src, exclude) {
	if (dst == null) {
		dst = {};
	}
	var fieldName;
	for (fieldName in src) {
		if (!(fieldName in exclude)) {
			copyOffset(dst, src, fieldName);
		}
	}
	for (fieldName in dst) {
		if (!(fieldName in exclude) && !(fieldName in src)) {
			delete dst[fieldName];
		}
	}
	return dst;
}

function copyFields(dst, src) {
	if (dst == null) {
		dst = {};
	}
	var fieldName;
	for (fieldName in src) {
		copyOffset(dst, src, fieldName)
	}
	for (fieldName in dst) {
		if (!(fieldName in src)) {
			delete dst[fieldName];
		}
	}
	return dst;
}

function copyObject(dst, src) {
//	console.trace();
	if (src === null) {
		dst = null;
	}
	else if (Array.isArray(src)) {
		dst = copyArray(dst, src);
	}
	else {
		var config;
		if (src.constructor in registrationsByConstructor) {
			config = registrationsByConstructor[src.constructor];
		}
		else if (src.constructor in registrationsByIndex) {
			config = registrationsByIndex[src.constructor];
		}
		if (config) {
			if (!dst || src.constructor !== dst.constructor) {
				dst = new config.ctor();
			}
			copyFieldsWithConfig(dst, src, config);
		}
		else {
			dst = copyFields(dst, src);
		}
	} 
	return dst;
}

function serialize(input) {
	var payload;
	var type;
	if (input === undefined) {
		type = 'u';
		payload = 0;
	}
	else if (input === null) {
		type = 'x';
		payload = 0;
	}
	else if (input.constructor in registrationsByConstructor) {
		var config = registrationsByConstructor[input.constructor];
		var fieldName;
		type = config.index;
		payload = {};
		if (config.fields) {
			for (var fieldIndex = 0; fieldIndex < config.fields.length; fieldIndex++) {
				fieldName = config.fields[fieldIndex];
				if (fieldName in input) {
					payload[fieldName] = serialize(input[fieldName]);
				}
			}
		}
		else if (config.not) {
			for (fieldName in input) {
				if (!(fieldName in config.not)) {
					payload[fieldName] = serialize(input[fieldName]);
				}
			}
		}
		else {
			for (fieldName in input) {
				payload[fieldName] = serialize(input[fieldName]);
			}
		}
	}
	else if (Array.isArray(input)) {
		type = 'a';
		payload = [];
		payload.length = input.length;
		for (var index = 0 ; index < input.length; index++) {
			payload[index] = serialize(input[index]);
		}
	}
	else if (typeof input === 'number') {
		type = 'n';
		payload = input;
	}
	else if (typeof input === 'object') {
		type = 'o';
		payload = {};
		for (fieldName in input) {
			payload[fieldName] = serialize(input[fieldName]);
		}
	}
	else if (typeof input !== 'function') {
		type = 'v';
		payload = input;
	}
	var output;
	if (type != null) {
		output = {};
		output[type] = payload;
	}
	return output;
}
syncem.serialize = serialize;

function deserialize(input) {
	var output;
	for (var type in input) {
		var payload = input[type];
		if (type in registrationsByIndex) {
			var config = registrationsByIndex[type];
			if (config.ctor_args) {
				var params = [];
				for (var argIndex = 0; argIndex < config.ctor_args.length ; argIndex++) {
					var arg_field = config.ctor_args[argIndex]
					var arg_value;
					if (arg_field in payload) {
						arg_value = deserialize(payload[arg_field]);
						delete payload[arg_field];
					}
					params.push(arg_value);
				}
				//Need to be able to call constructors with specific deserialized parameters.... !?
				output = Object.create(config.ctor.prototype);
				var ctor_output = config.ctor.apply(output, params);
				if (Object(ctor_output) === ctor_output) {
					output = ctor_output;
				}
			}
			else {
				output = new config.ctor();
			}
			if (config.fields) {
				for (var fieldIndex = 0; fieldIndex < config.fields.length; fieldIndex++) {
					fieldName = config.fields[fieldIndex];
					if (fieldName in payload) {
						output[fieldName] = deserialize(payload[fieldName]);
					}
				}
			}
			else if (config.not) {
				for (fieldName in payload) {
					if (!(fieldName in config.not)) {
						output[fieldName] = deserialize(payload[fieldName]);
					}
				}
			}
			else {
				for (fieldName in payload) {
					output[fieldName] = deserialize(payload[fieldName]);
				}
			}
		}
		else {
			switch (type) {
				case 'u':
					break;
				case 'x': 
					output = null;
					break;
				case 'a':
					output = [];
					output.length = payload.length;
					for (var index = 0 ; index < payload.length ; index++) {
						output[index] = deserialize(payload[index]);
					}
					break;
				case 'o':
					output = {};
					for (var fieldName in payload) {
						output[fieldName] = deserialize(payload[fieldName]);
					}
					break;
				case 'n':
					output = payload;
					break;
				case 'v':
					output = payload;
					break;
				default:
					throw "Unknown type " + type;
					break;
			}
		}
	}
	if (output === undefined) {
		console.warn("Failed to deserialize ", input);
	}
	return output;
}
syncem.deserialize = deserialize;


function SyncOb() {
}
SyncOb.prototype.update = function() {};
SyncOb.prototype.onDelete = function() {};
syncem.SyncOb = SyncOb;

function SyncMove(tick, id) {
	SyncOb.call(this);
	
	this.id = id || syncem.makeUid();
	this.tick = tick;
}
SyncMove.prototype = new SyncOb();
SyncMove.prototype.constructor = SyncMove;
syncem.registerClass(SyncMove);
syncem.SyncMove = SyncMove;

SyncMove.prototype.checkValid = function(state) {
	return true;
}

SyncMove.prototype.apply = function(state) {
};



function SyncObjectMove(objectId) {
	SyncMove.call(this);
	this.objectId = objectId;
}
SyncObjectMove.prototype = new SyncMove();
SyncObjectMove.prototype.constructor = SyncObjectMove;
syncem.registerClass(SyncObjectMove);
syncem.SyncObjectMove = SyncObjectMove;

SyncObjectMove.prototype.checkValid = function(state) {
	return this.objectId in state.objects;
};
	
SyncObjectMove.prototype.apply = function(state) {
	if (this.objectId in state.objects) {
		this.applyTo(state.objects[this.objectId]);
	}
	else {
		console.warn("Failed to apply move, couldn't find ", this.objectId);
	}
};
	
SyncObjectMove.prototype.applyTo = function(object) {
	throw "Unimplemented applyTo";
};


function ObjectAddedMove(object) {
	SyncObjectMove.call(this, object && object.id);
	this.object = object;
}
ObjectAddedMove.prototype = new SyncObjectMove();
ObjectAddedMove.prototype.constructor = ObjectAddedMove;
syncem.ObjectAddedMove = ObjectAddedMove;
syncem.registerClass(ObjectAddedMove);
ObjectAddedMove.prototype.apply = function(state) {
	state.objects[this.object.id] = this.object;
};


function ObjectRemovedMove(objectId) {
	SyncObjectMove.call(this, objectId);
}
ObjectRemovedMove.prototype = new SyncObjectMove();
ObjectRemovedMove.prototype.constructor = ObjectRemovedMove;
syncem.ObjectRemovedMove = ObjectRemovedMove;
syncem.registerClass(ObjectRemovedMove);

ObjectRemovedMove.prototype.apply = function(state) {
	console.log("Applying ObjectRemovedMove for ", this.objectId);
	state.objects[this.objectId].onDelete(state);
	delete state.objects[this.objectId];
};


function ObjectChatMove(objectId, message, ttl) {
	SyncObjectMove.call(this, objectId);
	
	this.message = message;
	this.ttl = ttl || 50;
	
}
ObjectChatMove.prototype.apply = function(state) {
	state.messages.push(this.getMessageData(state));
	if (state.messages.length > 50) {
		state.messages.shift();
	}
};

ObjectChatMove.prototype.getMessageData = function(state) {
	return {
		id: this.id,
		objectId: this.objectId,
		message: this.message,
		expiresAt: state.tick + 50
	};
};

syncem.ObjectChatMove = ObjectChatMove;
syncem.registerClass(ObjectChatMove);


function SyncRoot() {
	syncem.SyncOb.call(this);
	
	//Moves are not copied between states and not synchronized in the same way
	this.moves = {};
	
	this.tick = 0;
	this.objects = {};
	this.messages = [];
}
SyncRoot.prototype = new SyncOb();
SyncRoot.prototype.constructor = SyncRoot;
syncem.SyncRoot = SyncRoot;
syncem.registerClass({'not':['moves']}, SyncRoot);
	
SyncRoot.prototype.applyMoves = function() {
	for (var moveId in this.moves) {
//			console.log("Applying move at ", this.tick, ": ", this.moves[moveId]);
		this.moves[moveId].apply(this);
	}
};

SyncRoot.prototype.updateObjects = function() {
	for (var objId in this.objects) {
		this.objects[objId].update(this);
	}
};

SyncRoot.prototype.updateMessages = function() {
	for (var messageIndex = 0; messageIndex < this.messages.length ; messageIndex ++) {
		var message = this.messages[messageIndex];
		if (message.expiry && this.tick >= message.expiresAt) {
			this.messages.splice(messageIndex, 1);
			messageIndex--;
		}
	}
};

SyncRoot.prototype.update = function() {
	this.applyMoves();
	this.updateObjects();
	this.updateMessages();
};

SyncRoot.prototype.getAsInitial = function() {
	var out = {};
	var config = registrationsByConstructor[this.constructor];
	out.constructor = config.index;
	copyFieldsWithConfig(out, this, config);
	return out;
}


function Syncer(config) {
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
}
syncem.Syncer = Syncer;

Syncer.prototype.start = function(state, tick) {
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

Syncer.prototype.startInterval = function() {
	var syncer = this;
	console.log("startInterval with time ", new Date(syncer.start_time));
	this.interval = setInterval(function() {
		syncer.update();
	}, 1000 / this.config.lps);
};

Syncer.prototype.stop = function() {
	if (this.interval) {
		clearInterval(this.interval);
		this.interval = null;
	}
};

Syncer.prototype.addMove = function(move, allowFuture) {
	var next_tick = Math.ceil(this.getNowTick());
	var valid = move.tick > this.getOldestTick() && (allowFuture || move.tick <= next_tick);
//		console.log("addMove valid tick range:",this.getOldestTick(),"->",now_tick,":",move);
	if (valid) {
		if (move.tick >= next_tick) {
			if (!(move.tick in this.queuedMoves)) {
				this.queuedMoves[move.tick] = {};
			}
			console.log("Enqueued move ", move);
			this.queuedMoves[move.tick][move.id] = move;
		}
		else {
			var move_state = this.getState(move.tick);
			if (move_state) {
				move_state.moves[move.id] = move;
			}
			else {
				console.error("Failed to add move ", move, ", move state null, oldest=",this.getOldestTick()," next=" + next_tick);
			}
		}
		if (move.tick <= this.dirty_tick) {
			this.dirty_tick = move.tick - 1;
		}
	}
	else {
		console.warn("addMove failed, out of range (",this.getOldestTick(),"->",next_tick,"):", move);
	}
	return valid;
};

Syncer.prototype.getNowTick = function() {
	var now = new Date().getTime();
	return (now - this.start_time) * this.config.lps / 1000;
}

Syncer.prototype.update = function() {
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
			next_state = this.states[next_index] = copyObject(null, this.states[prev_index]);
		}
		//Recycled old state?
		else if (next_state.tick != this.dirty_tick) {
			//clear out old invalid moves
			next_state.moves = {};
		}
		//Any queued moves for this state?
		if (this.dirty_tick in this.queuedMoves) {
			var moves = this.queuedMoves[this.dirty_tick];
			for (var moveId in moves) {
				console.log("Adding queued move ", moveId, ":", moves[moveId]);
				next_state.moves[moveId] = moves[moveId];
			}
			delete this.queuedMoves[this.dirty_tick];
		}

		//Only copy the objects, not the moves
		next_state = copyObject(next_state, prev_state);
		next_state.tick = this.dirty_tick;
		next_state.update();
		if (this.tick < this.dirty_tick) {
			this.tick = this.dirty_tick;
		}
	}
};

Syncer.prototype.getOldestTick = function() {
	return Math.max(0, this.tick - this.config.history_size + 1);
};

Syncer.prototype.getState = function(tick) {
	if (tick == null) {
		tick = this.tick;
	}
	var state = null;
	if (tick >= this.getOldestTick() && tick <= this.tick) {
		state = this.states[tick % this.config.history_size];
	}
	return state;
};

Syncer.prototype.getAllMovesByTick = function() {
	var moves_by_tick = {};
	function addMoves(moves) {
		for (var move_id in moves) {
			var move = moves[move_id];
			if (!(move.tick in moves_by_tick)) {
				moves_by_tick[move.tick] = {};
			}
			moves_by_tick[move.tick][move_id] = move;
		}
	}
	for (var stateIndex = 0; stateIndex < this.states.length; stateIndex ++) {
		addMoves(this.states[stateIndex].moves);
	}
	for (var tick in this.queuedMoves) {
		addMoves(this.queuedMoves[tick]);
	}
	return moves_by_tick;
};

Syncer.prototype.getSetup = function() {
	var oldest_tick = this.getOldestTick();
	return {
		config: this.config,
		oldest: this.states[oldest_tick % this.config.history_size],
		current_tick: this.getNowTick(),
		moves: this.getAllMovesByTick()
	};
};

syncem.Syncer.createFromSetup = function(setup) {
	var syncer = new syncem.Syncer(setup.config);
	syncer.states[setup.oldest.tick % syncer.config.history_size] = setup.oldest;
	syncer.tick = syncer.dirty_tick = setup.oldest.tick;
	syncer.start_time = new Date().getTime() - setup.current_tick * 1000 / syncer.config.lps;
	syncer.queuedMoves = setup.moves;
	syncer.update();
	syncer.startInterval();
	return syncer;
};

})(typeof exports === 'undefined'? this['syncem']={}: exports);

