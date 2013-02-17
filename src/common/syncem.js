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



function simpleChecksum(str) {
	var checksum = 0;
	for (var i=0 ; i < str.length ; i++) {
		checksum = str.charCodeAt(i) ^ (checksum << 5) ^ (checksum >>> 27);
	}
	return checksum;
}
syncem.simpleChecksum = simpleChecksum;

function ObjectMapper() {
	this.num_objects = 0;
	this.objects = [];
}
ObjectMapper.pool = [];
ObjectMapper.create = function () {
	var mapper;
	if (ObjectMapper.pool.length > 0) {
//		console.log("Recycling object mapper from pool of "+ ObjectMapper.pool.length);
		mapper = ObjectMapper.pool.shift();
	}
	else {
//		console.log("Creating new ObjectMapper");
		mapper = new ObjectMapper();
	}
	return mapper;
};

ObjectMapper.prototype.set = function(k, v) {
	if (k.$syncemid != null) {
		console.trace('Object already set ' + k.$syncemid);
		this.objects[k.$syncemid].v = v;
	}
	else {
		k.$syncemid = this.num_objects++;
		if (this.num_objects > this.objects.length) {
			this.objects.push({k:k,v:v});
		}
		else {
			var obj = this.objects[k.$syncemid];
			obj.k = k;
			obj.v = v;
		}
//		console.trace('Setting object ' + k.$syncemid);
	}
	return k.$syncemid;
};
ObjectMapper.prototype.get = function(k) {
	return k.$syncemid && this.objects[k.$syncemid].v;
};
ObjectMapper.prototype.getIndex = function(k) {
	return k.$syncemid;
};
ObjectMapper.prototype.discard = function() {
	for (var i=0;i<this.num_objects;i++) {
		var obj = this.objects[i];
		delete obj.k.$syncemid;
		obj.k = null;
		obj.v = null;
	}
	this.num_objects = 0;
	ObjectMapper.pool.push(this);
};
ObjectMapper.prototype.getFinalValues = function() {
	var values = [];
	values.length = this.num_objects;
	for (var i=0;i<this.num_objects;i++) {
		var obj = this.objects[i];
		delete obj.k.$syncemid;
		values[i] = obj.v;
		values[i].i = i;
		obj.k = null;
		obj.v = null;
	}
	this.num_objects = 0;
	ObjectMapper.pool.push(this);
	return values;
};

//var indent = '';
function copyOffset(dst, src, key, objectdb) {
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
			dst[key] = copyObject(dst[key], src_value, objectdb);
			break;
		default:
			throw "Unrecognised type: " + typeof src_value;
	}
//	indent = indent.substr(0,indent.length - 1);
}

function copyArray(dst_array, src_array, objectdb) {
	if (!Array.isArray(dst_array)) {
		dst_array = [];
	}
	objectdb.set(src_array, dst_array);
	dst_array.length = src_array.length;
	for (var index = 0 ; index < src_array.length; index++) {
		copyOffset(dst_array, src_array, index, objectdb);
	}
	return dst_array;
}

function copyFieldsWithConfig(dst, src, config, objectdb) {
	var top_level = objectdb == null;
	if (top_level) {
		objectdb = ObjectMapper.create();
	}
	if (config.fields) {
		objectdb.set(src, dst);
		for (var fieldIndex = 0; fieldIndex < config.fields.length; fieldIndex++) {
			var fieldName = config.fields[fieldIndex];
			if (fieldName !== '$syncemid') {
				if (fieldName in src) {
					copyOffset(dst, src, fieldName, objectdb);
				}
				else {
					delete dst[fieldName];
				}
			}
		}
	}
	else if (config.not) {
		copyFieldsExcluding(dst, src, config.not, objectdb);
	}
	else {
		copyFields(dst, src, objectdb);
	}
	if (top_level) {
		objectdb.discard();
	}
}

function copyFieldsExcluding(dst, src, exclude, objectdb) {
	if (dst == null) {
		dst = {};
	}
	objectdb.set(src, dst);
	var fieldName;
	for (fieldName in src) {
		if (!(fieldName in exclude) && fieldName !== '$syncemid') {
			copyOffset(dst, src, fieldName, objectdb);
		}
	}
	for (fieldName in dst) {
		if (!(fieldName in exclude) && !(fieldName in src) && fieldName !== '$syncemid') {
			delete dst[fieldName];
		}
	}
	return dst;
}

function copyFields(dst, src, objectdb) {
	if (dst == null) {
		dst = {};
	}
	objectdb.set(src, dst);
	var fieldName;
	for (fieldName in src) {
		if (fieldName !== '$syncemid') {
			copyOffset(dst, src, fieldName, objectdb)
		}
	}
	for (fieldName in dst) {
		if (!(fieldName in src) && fieldName !== '$syncemid') {
			delete dst[fieldName];
		}
	}
	return dst;
}

//var fs = typeof require === 'function' ? require('fs'): null;

function copyObject(dst, src, objectdb) {
//	indent += ' ';
//	console.log(indent + "copying object: " + src);
	var top_level = objectdb == null;
	if (objectdb == null) {
//		var t0 = new Date().getTime();
		objectdb = ObjectMapper.create();
	}
//	console.trace();
	if (src === null) {
		dst = null;
	}
	else {
		var found = objectdb.get(src);
		if (found != null) {
			dst = found;
//			console.log("Found " + src.$syncemid + " in copy db");
		}
		else if ((global.Uint8Array && src instanceof global.Uint8Array) 
			|| (global.Uint16Array && src instanceof global.Uint16Array) 
			|| (global.Uint32Array && src instanceof global.Uint32Array) 
			|| (global.Int8Array && src instanceof global.Int8Array) 
			|| (global.Int16Array && src instanceof global.Int16Array) 
			|| (global.Int32Array && src instanceof global.Int32Array) 
			|| (global.FloatArray && src instanceof global.FloatArray) 
			|| (global.Float32Array && src instanceof global.Float32Array) 
			|| (global.DoubleArray && src instanceof global.DoubleArray) 
			|| (global.Float64Array && src instanceof global.Float64Array)) {
			if (dst != null && src.constructor === dst.constructor && src.length === dst.length) {
				dst.length = src.length;
			}
			else {
				dst = new src.constructor(src.length);
			}
			objectdb.set(src, dst);
			dst.set(src);
		}
		else if (Array.isArray(src)) {
			dst = copyArray(dst, src, objectdb);
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
					if (config.ctor_args) {
						var params = [];
						for (var argIndex = 0; argIndex < config.ctor_args.length ; argIndex++) {
							var arg_field = config.ctor_args[argIndex]
							var arg_value;
							if (arg_field in src) {
								arg_value = src[arg_field];
							}
							params.push(arg_value);
						}
						//Need to be able to call constructors with specific deserialized parameters.... !?
						dst = Object.create(config.ctor.prototype);
						var ctor_output = config.ctor.apply(dst, params);
						if (Object(ctor_output) === ctor_output) {
							dst = ctor_output;
						}
					}
					else {
						dst = new config.ctor();
					}
				}
				copyFieldsWithConfig(dst, src, config, objectdb);
			}
			else {
				dst = copyFields(dst, src, objectdb);
			}
		}
	}
	if (top_level) {
//		console.log("Copy finished, used ", objectdb.objects.length, "objects. copy took " , new Date().getTime() - t0 , "ms; mem=", global.process != null ? process.memoryUsage() : '?');
		objectdb.discard();
//		var serialized_dst = JSON.stringify(syncem.serialize(dst), null, ' ');
//		if (serialized_dst != prev_serialized) {
//			prev_serialized = serialized_dst;
//		}
//		var serialized_src = JSON.stringify(syncem.serialize(src), null, ' ');
//		if (serialized_src != serialized_dst) {
//			console.log("copy failure at ",bcount);
//			fs.writeFileSync('dump'+bcount+'_a.json', serialized_src);
//			fs.writeFileSync('dump'+bcount+'_b.json', serialized_dst);
//			process.exit();
//		}
	}
//	indent = indent.substr(0,indent.length - 1);
	return dst;
}
//var prev_serialized = null;
//var bcount = 0;

function serialize(input, objectdb) {
//	console.log("registrations:", registrationsByIndex.length);
	var top_level = objectdb === undefined;
	if (top_level) {
		objectdb = ObjectMapper.create();
	}
	var payload;
	var output;
	function serializeArray(type) {
		var entry = {};
		payload = [];
		payload.length = input.length;
		entry[type] = payload;
		output = {r:objectdb.set(input, entry)};
		for (var index = 0 ; index < input.length; index++) {
//			console.log("Serializing array ", type, "[", index, "]:", input[index]);
			payload[index] = serialize(input[index], objectdb);
		}
	}
	
	if (input === undefined) {
		output = {u:0};
	}
	else if (input === null) {
		output = {x:0};
	}
	else if (typeof input == 'object' && (payload = objectdb.getIndex(input)) !== undefined) {
		output = {r:payload};
//		console.log("Outputting already-serialized ", output);
	}
	else if (input.constructor in registrationsByConstructor) {
		var config = registrationsByConstructor[input.constructor];
		var fieldName;
		payload = {};
		var entry = {};
		entry[config.index] = payload;
		output = {r:objectdb.set(input, entry)};
		if (config.fields) {
			for (var fieldIndex = 0; fieldIndex < config.fields.length; fieldIndex++) {
				fieldName = config.fields[fieldIndex];
				if (fieldName in input) {
					if (typeof input[fieldName] != 'function' && fieldName !== '$syncemid') {
						payload[fieldName] = serialize(input[fieldName], objectdb);
					}
				}
			}
		}
		else if (config.not) {
			for (fieldName in input) {
				if (!(fieldName in config.not) && typeof input[fieldName] != 'function' && fieldName !== '$syncemid') {
					payload[fieldName] = serialize(input[fieldName], objectdb);
				}
			}
		}
		else {
			for (fieldName in input) {
				if (typeof input[fieldName] != 'function' && fieldName !== '$syncemid') {
					payload[fieldName] = serialize(input[fieldName], objectdb);
				}
			}
		}
	}
	else if (global.Uint8Array && input instanceof global.Uint8Array) {
		serializeArray('au8');
	}
	else if (global.Uint16Array && input instanceof global.Uint16Array) {
		serializeArray('au16');
	}
	else if (global.Uint32Array && input instanceof global.Uint32Array) {
		serializeArray('au32');
	}
	else if (global.Int8Array && input instanceof global.Int8Array) {
		serializeArray('ai8');
	}
	else if (global.Int16Array && input instanceof global.Int16Array) {
		serializeArray('ai16');
	}
	else if (global.Int32Array && input instanceof global.Int32Array) {
		serializeArray('ai32');
	}
	else if (global.FloatArray && input instanceof global.FloatArray) {
		serializeArray('af32');
	}
	else if (global.Float32Array && input instanceof global.Float32Array) {
		serializeArray('af32');
	}
	else if (global.DoubleArray && input instanceof global.DoubleArray) {
		serializeArray('af64');
	}
	else if (global.Float64Array && input instanceof global.Float64Array) {
		serializeArray('af64');
	}
//	else if (global.ArrayBuffer && input instanceof global.ArrayBuffer) {
//		payload = [];
//		output = {r:objectdb.set(input, {af:payload})};
//		for (var index = 0 ; index < input.length; index++) {
//			payload[index] = serialize(input[index], objectdb);
//		}
//	}
	else if (Array.isArray(input)) {
		payload = [];
		payload.length = input.length;
		output = {r:objectdb.set(input, {a:payload})};
		for (var index = 0 ; index < input.length; index++) {
			payload[index] = serialize(input[index], objectdb);
		}
	}
	else if (typeof input === 'number') {
		output = {n:input};
	}
	else if (typeof input === 'object') {
		payload = {};
		if (input.constructor && input.constructor.name !== 'Object') {
//			console.warn("Unregistered serializer? ", input.constructor.name || input.constructor);
		}
		output = {r:objectdb.set(input, {o:payload})};
		for (fieldName in input) {
			if (typeof input[fieldName] != 'function' && fieldName !== '$syncemid') {
				payload[fieldName] = serialize(input[fieldName], objectdb);
			}
		}
	}
	else if (typeof input !== 'function') {
		output = {v:input};
	}
	if (top_level) {
		if (output === undefined) {
			output = {};
		}
		output.d = objectdb.getFinalValues();
	}
	if (output != null && 'n' in output && output.n == null) {
		console.error("Outputting null as a number?!" , input);
	}
	return output;
}
syncem.serialize = serialize;

function deserialize(input, objectdb_in, objectdb_out) {
	if (input != null && input.d != null) {
		objectdb_in = input.d;
		delete input.d;
		objectdb_out = [];
		objectdb_out.length = objectdb_in.length;
	}
	else if (objectdb_out == null) {
		objectdb_out = [];
		objectdb_in = [];
	}
	var output;
	var reference;
	if (input != null && input.r != null) {
		reference = input.r;
		delete input.r;
	}
	if (reference != null && objectdb_out[reference] != null) {
		output = objectdb_out[reference];
		console.log("Using reference " + reference + " in output db");
	}
	else {
//		if (reference != null) {
//			console.log("Failed to find reference " + reference + " in output db");
//		}
		if (reference != null && objectdb_in[reference] != null) {
			input = objectdb_in[reference];
			delete input.i;
		}
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
							arg_value = deserialize(payload[arg_field], objectdb_in, objectdb_out);
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
				if (reference != null) {
					objectdb_out[reference] = output;
				}
				if (config.fields) {
					for (var fieldIndex = 0; fieldIndex < config.fields.length; fieldIndex++) {
						fieldName = config.fields[fieldIndex];
						if (fieldName in payload) {
							output[fieldName] = deserialize(payload[fieldName], objectdb_in, objectdb_out);
						}
					}
				}
				else if (config.not) {
					for (fieldName in payload) {
						if (!(fieldName in config.not)) {
							output[fieldName] = deserialize(payload[fieldName], objectdb_in, objectdb_out);
						}
					}
				}
				else {
					for (fieldName in payload) {
						output[fieldName] = deserialize(payload[fieldName], objectdb_in, objectdb_out);
					}
				}
			}
			else {
				function deserializeArray(type) {
					output = new type(payload.length);
					if (reference != null) {
						objectdb_out[reference] = output;
					}
					for (var index = 0 ; index < payload.length ; index++) {
						output[index] = deserialize(payload[index], objectdb_in, objectdb_out);
					}
					return output;
				}
				
				switch (type) {
					case 'u':
						break;
					case 'x': 
						output = null;
						break;
					case 'a':
						output = [];
						output.length = payload.length;
						if (reference != null) {
							objectdb_out[reference] = output;
						}
						for (var index = 0 ; index < payload.length ; index++) {
							output[index] = deserialize(payload[index], objectdb_in, objectdb_out);
						}
						break;
					case 'af32':
						deserializeArray(global.Float32Array || global.FloatArray || Array);
						break;
					case 'af64':
						deserializeArray(global.Float64Array || global.DoubleArray || Array);
						break;
					case 'ai8':
						deserializeArray(global.Int8Array || Array);
						break;
					case 'ai16':
						deserializeArray(global.Int16Array || Array);
						break;
					case 'ai32':
						deserializeArray(global.Int32Array || Array);
						break;
					case 'au8':
						deserializeArray(global.Uint8Array || Array);
						break;
					case 'au16':
						deserializeArray(global.Uint16Array || Array);
						break;
					case 'au32':
						deserializeArray(global.Uint32Array || Array);
						break;
					case 'o':
						output = {};
						if (reference != null) {
							objectdb_out[reference] = output;
						}
						for (var fieldName in payload) {
							output[fieldName] = deserialize(payload[fieldName], objectdb_in, objectdb_out);
						}
						break;
					case 'n':
					case 'v':
						output = payload;
						break;
					default:
						throw "Unknown type " + type;
						break;
				}
			}
		}
	}
//	if (output === undefined) {
//		console.warn("Failed to deserialize ", input);
//	}
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
	console.log("Applying ObjectRemovedMove for ", this.objectId, " in tick ", state.tick);
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
		this.moves[moveId].apply(this);
	}
};

SyncRoot.prototype.updateObjects = function() {
//	var n_objects = 0;
//	for (var objId in this.objects) {
//		n_objects ++;
//	}
//	console.log("Updating SyncRoot with ", n_objects, " objects");
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

SyncRoot.prototype.getCheckString = function() {
	return JSON.stringify(serialize(this)) + JSON.stringify(serialize(this.moves));
};


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
	var interval_ms = 1000 / this.config.lps;
	this.interval = setInterval(function() {
		var t0 = new Date().getTime();
//		console.log("Updating at ", t0);
		syncer.update();
		var time_taken = new Date().getTime() - t0;
		if (time_taken >= interval_ms) {
			console.warn("syncer.update took " + time_taken + "ms (interval is " + interval_ms + "ms)");
		}
//		console.log("Updating at ", t0);
//		console.warn("Update took ", time_taken, " (want ", interval_ms, ")");
	}, interval_ms);
};

Syncer.prototype.stop = function() {
	if (this.interval) {
		clearInterval(this.interval);
		this.interval = null;
	}
};

Syncer.prototype.addMove = function(move, allowFuture) {
	var next_tick = Math.ceil(this.getNowTick()) + 1;
	var valid = move.tick > this.getOldestTick() && (allowFuture || move.tick <= next_tick);
//		console.log("addMove valid tick range:",this.getOldestTick(),"->",now_tick,":",move);
	if (valid) {
		if (move.tick > this.tick) {
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
			console.log("Old move at ",move.tick," causing dirtiness from ",this.dirty_tick);
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
//	console.log("Updating ", this.dirty_tick, "->", now_tick);
	while (this.dirty_tick < now_tick) {
		var prev_tick = this.dirty_tick++;

//		console.log("copying ", prev_tick, " into ", this.dirty_tick);
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
			next_state.record = null;
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

//		console.log("copying ", prev_tick, " into ", this.dirty_tick);
		//Only copy the objects, not the moves
		next_state = copyObject(next_state, prev_state);
//		console.log("copied ", prev_tick, " into ", this.dirty_tick);
		next_state.tick = this.dirty_tick;
		next_state.update();
		
//		if (typeof require != 'undefined') {
//			var util = require('util');
//			var old_record = next_state.record;
//			delete next_state.record;
//			var record = util.inspect(next_state, false, 10);
//			if (old_record && replays_written < 10) {
//				if (record != old_record) {
//					console.log("Dumping rewound results");
//					var fs = require('fs');
//					var serial = this.dirty_tick;
//					while (serial.length < 9) serial = '0' + serial;
//					fs.writeFile('dump_' + serial + 'a.json', old_record);
//					fs.writeFile('dump_' + serial + 'b.json', record);
//					replays_written++;
//				}
//				else {
//					console.log("REPLAY IDENTICAL! :D");
//				}
//			}
//			next_state.record = record;
//		}
		
//		console.log("updated", this.dirty_tick);
		if (this.tick < this.dirty_tick) {
			this.tick = this.dirty_tick;
		}
		if (this.onUpdate) {
			this.onUpdate();
		}
	}
};
//var replays_written = 0;

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
	syncer.config.history_size *= 2;
	syncer.states[setup.oldest.tick % syncer.config.history_size] = setup.oldest;
	syncer.tick = syncer.dirty_tick = setup.oldest.tick;
	syncer.start_time = new Date().getTime() - setup.current_tick * 1000 / syncer.config.lps;
	syncer.queuedMoves = setup.moves;
	syncer.update();
	syncer.startInterval();
	return syncer;
};

})(typeof exports === 'undefined'? this['syncem']={}: exports);

