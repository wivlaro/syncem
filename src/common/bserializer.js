(function(bserializer) {

function Packet(arrayBuffer) {
	this.impl = new DataView(arrayBuffer);
	this.offset = 0;
}

Packet.prototype.getDelivery = function() {
	return this.impl.buffer.slice(0, this.offset);
};

var PACKET_DEBUG = false;
var PACKET_PROFILE = true;
var pp = {};

var gensym_count = 0;
function gensym(prefix) {
	if (typeof prefix === 'string') {
		prefix = prefix.replace(/^[^a-z]/gi,'_').replace(/[^a-z0-9]/gi,'_');
	}
	else {
		prefix = 'gensym';
	}
	return prefix + '_' + (gensym_count++).toString(36);
}

Packet.prototype.readBoolean = function() { return this.readUint8() !== 0; };
Packet.prototype.writeBoolean = function(value) { this.writeUint8(value ? 1 : 0); };

Packet.prototype.readInt8   = function() { var value = this.impl.getInt8   (this.offset); this.offset++;    return value; };
Packet.prototype.readUint8  = function() { var value = this.impl.getUint8  (this.offset); this.offset++;    return value; };
Packet.prototype.readInt16  = function() { var value = this.impl.getInt16  (this.offset); this.offset += 2; return value; };
Packet.prototype.readUint16 = function() { var value = this.impl.getUint16 (this.offset); this.offset += 2; return value; };
Packet.prototype.readInt32  = function() { var value = this.impl.getInt32  (this.offset); this.offset += 4; return value; };
Packet.prototype.readUint32 = function() { var value = this.impl.getUint32 (this.offset); this.offset += 4; return value; };
Packet.prototype.readFloat32= function() { var value = this.impl.getFloat32(this.offset); this.offset += 4; return value; };
Packet.prototype.readFloat64= function() { var value = this.impl.getFloat64(this.offset); this.offset += 8; return value; };

Packet.prototype.writeInt8   = function(value) { this.impl.setInt8   (this.offset++, value); };
Packet.prototype.writeUint8  = function(value) { this.impl.setUint8  (this.offset++, value); };
Packet.prototype.writeInt16  = function(value) { this.impl.setInt16  (this.offset, value); this.offset += 2; };
Packet.prototype.writeUint16 = function(value) { this.impl.setUint16 (this.offset, value); this.offset += 2; };
Packet.prototype.writeInt32  = function(value) { this.impl.setInt32  (this.offset, value); this.offset += 4; };
Packet.prototype.writeUint32 = function(value) { this.impl.setUint32 (this.offset, value); this.offset += 4; };
Packet.prototype.writeFloat32= function(value) { this.impl.setFloat32(this.offset, value); this.offset += 4; };
Packet.prototype.writeFloat64= function(value) { this.impl.setFloat64(this.offset, value); this.offset += 8; };

Packet.prototype.writeSmartUint = function(value) {
	if (value < (1<<6)) {
		this.writeUint8(value);
		return;
	}
	value -= 64;
	if (value < (1<<14)) {
		this.writeUint8(0x40 | (value >>> 8));
		this.writeUint8(value & 0xff);
		return;
	}
	value -= (1<<14);
	if (value < (1<<22)) {
		this.writeUint8(0x80 | (value >>> 16));
		this.writeUint8((value >>> 8) & 0xff);
		this.writeUint8(value & 0xff);
		return;
	}
	value -= (1<<22);
	if (value < (1<<30)) {
		this.writeUint8(0xc0 | (value >>> 24));
		this.writeUint8((value >>> 16) & 0xff);
		this.writeUint8((value >>> 8) & 0xff);
		this.writeUint8(value & 0xff);
		return;
	}
	throw "Value too large for smart uint: " + value + " over";
};

Packet.prototype.readSmartUint = function() {
	var value = this.readUint8();
	if (value < 64) {
		return value;
	}
	switch (value >>> 6) {
		case 0:
			return value;
		case 1:
			value = (value & 0x3f);
			value = (value << 8) + this.readUint8();
			value += 1<<6;
			return value;
		case 2:
			value = (value & 0x3f);
			value = (value << 8) + this.readUint8();
			value = (value << 8) + this.readUint8();
			value += (1<<6) + (1<<14);
			return value;
		case 3:
			value = (value & 0x3f);
			value = (value << 8) + this.readUint8();
			value = (value << 8) + this.readUint8();
			value = (value << 8) + this.readUint8();
			value += (1<<6) + (1<<14) + (1<<22);
			return value;
	}
	throw "Invalid state!";
};

Packet.prototype.readString = function() {
	var length = this.readSmartUint();
	var value = '';
	for (var index = 0; index < length; index ++) {
		var char = this.readUint8();
		if (char >= 0xc0) {
			if (char < 0xe0) {
				char = ((char & 0x1f) << 6)
						+ (this.readUint8() & 0x3f);
			}
			else if (char < 0xf0) {
				char = ((char & 0x0f) << 12)
						+ ((this.readUint8() & 0x3f) << 6)
						+ (this.readUint8() & 0x3f);
			}
			else if (char < 0xf8) {
				char = ((char & 0x07) << 18)
						+ ((this.readUint8() & 0x3f) << 12)
						+ ((this.readUint8() & 0x3f) << 6)
						+ (this.readUint8() & 0x3f);
			}
			else if (char < 0xfc) {
				char = ((char & 0x03) << 24)
						+ ((this.readUint8() & 0x3f) << 18)
						+ ((this.readUint8() & 0x3f) << 12)
						+ ((this.readUint8() & 0x3f) << 6)
						+ (this.readUint8() & 0x3f);
			}
			else {
				char = ((char & 0x01) << 30)
						+ ((this.readUint8() & 0x3f) << 24)
						+ ((this.readUint8() & 0x3f) << 18)
						+ ((this.readUint8() & 0x3f) << 12)
						+ ((this.readUint8() & 0x3f) << 6)
						+ (this.readUint8() & 0x3f);
			}
		}
		value += String.fromCharCode(char);
	}
	return value;
};

Packet.prototype.writeString = function(value) {
	var length = value.length;
	this.writeSmartUint(length);
	for (var index = 0 ; index < value.length; index++) {
		var codePoint = value.charCodeAt(index);
		if (codePoint < 0x80) {
			this.writeUint8(codePoint);
		}
		else if (codePoint < 0x800) {
			this.writeUint8(0xc0 + (codePoint >>> 6));
			this.writeUint8(0x80 + (codePoint & 0x3f));
		}
		else if (codePoint < 0x10000) {
			this.writeUint8(0xe0 + (codePoint >>> 12));
			this.writeUint8(0x80 + ((codePoint >>> 6) & 0x3f));
			this.writeUint8(0x80 + (codePoint & 0x3f));
		}
		else if (codePoint < 0x200000) {
			this.writeUint8(0xf0 + (codePoint >>> 18));
			this.writeUint8(0x80 + ((codePoint >>> 12) & 0x3f));
			this.writeUint8(0x80 + ((codePoint >>> 6) & 0x3f));
			this.writeUint8(0x80 + (codePoint & 0x3f));
		}
		else if (codePoint < 0x4000000) {
			this.writeUint8(0xf8 + (codePoint >>> 24));
			this.writeUint8(0x80 + ((codePoint >>> 18) & 0x3f));
			this.writeUint8(0x80 + ((codePoint >>> 12) & 0x3f));
			this.writeUint8(0x80 + ((codePoint >>> 6) & 0x3f));
			this.writeUint8(0x80 + (codePoint & 0x3f));
		}
		else {
			this.writeUint8(0xfc + (codePoint >>> 30));
			this.writeUint8(0x80 + ((codePoint >>> 24) & 0x3f));
			this.writeUint8(0x80 + ((codePoint >>> 18) & 0x3f));
			this.writeUint8(0x80 + ((codePoint >>> 12) & 0x3f));
			this.writeUint8(0x80 + ((codePoint >>> 6) & 0x3f));
			this.writeUint8(0x80 + (codePoint & 0x3f));
		}
	}
};

bserializer.Packet = Packet;

var have_BufferPacket = typeof Buffer === 'function';
if (have_BufferPacket) {
	
	function BufferPacket(buffer) {
		this.impl = buffer;
		this.offset = 0;
	}
	
	BufferPacket.prototype = new Packet(new Buffer(1));
	BufferPacket.prototype.constructor = BufferPacket;
	
	BufferPacket.prototype.readInt8   = function() { var value = this.impl.readInt8     (this.offset); this.offset++;    PACKET_DEBUG && console.log("Read ",value); return value; };
	BufferPacket.prototype.readUint8  = function() { var value = this.impl.readUInt8    (this.offset); this.offset++;    PACKET_DEBUG && console.log("Read ",value); return value; };
	BufferPacket.prototype.readInt16  = function() { var value = this.impl.readInt16BE  (this.offset); this.offset += 2; PACKET_DEBUG && console.log("Read ",value); return value; };
	BufferPacket.prototype.readUint16 = function() { var value = this.impl.readUInt16BE (this.offset); this.offset += 2; PACKET_DEBUG && console.log("Read ",value); return value; };
	BufferPacket.prototype.readInt32  = function() { var value = this.impl.readInt32BE  (this.offset); this.offset += 4; PACKET_DEBUG && console.log("Read ",value); return value; };
	BufferPacket.prototype.readUint32 = function() { var value = this.impl.readUInt32BE (this.offset); this.offset += 4; PACKET_DEBUG && console.log("Read ",value); return value; };
	BufferPacket.prototype.readFloat32= function() { var value = this.impl.readFloatBE  (this.offset); this.offset += 4; PACKET_DEBUG && console.log("Read ",value); return value; };
	BufferPacket.prototype.readFloat64= function() { var value = this.impl.readDoubleBE (this.offset); this.offset += 8; PACKET_DEBUG && console.log("Read ",value); return value; };
	
	BufferPacket.prototype.writeInt8   = function(value) { if (PACKET_PROFILE) { var s = new Error().stack.split("\n"); for (var i=1;i<s.length && i<10;i++) pp[s[i]] = (pp[s[i]]||0) + 1; } this.impl.writeInt8     (value, this.offset++); };
	BufferPacket.prototype.writeUint8  = function(value) { if (PACKET_PROFILE) { var s = new Error().stack.split("\n"); for (var i=1;i<s.length && i<10;i++) pp[s[i]] = (pp[s[i]]||0) + 1; } this.impl.writeUInt8    (value, this.offset++); };
	BufferPacket.prototype.writeInt16  = function(value) { if (PACKET_PROFILE) { var s = new Error().stack.split("\n"); for (var i=1;i<s.length && i<10;i++) pp[s[i]] = (pp[s[i]]||0) + 2; } this.impl.writeInt16BE  (value, this.offset  ); this.offset += 2; };
	BufferPacket.prototype.writeUint16 = function(value) { if (PACKET_PROFILE) { var s = new Error().stack.split("\n"); for (var i=1;i<s.length && i<10;i++) pp[s[i]] = (pp[s[i]]||0) + 2; } this.impl.writeUInt16BE (value, this.offset  ); this.offset += 2; };
	BufferPacket.prototype.writeInt32  = function(value) { if (PACKET_PROFILE) { var s = new Error().stack.split("\n"); for (var i=1;i<s.length && i<10;i++) pp[s[i]] = (pp[s[i]]||0) + 4; } this.impl.writeInt32BE  (value, this.offset  ); this.offset += 4; };
	BufferPacket.prototype.writeUint32 = function(value) { if (PACKET_PROFILE) { var s = new Error().stack.split("\n"); for (var i=1;i<s.length && i<10;i++) pp[s[i]] = (pp[s[i]]||0) + 4; } this.impl.writeUInt32BE (value, this.offset  ); this.offset += 4; };
	BufferPacket.prototype.writeFloat32= function(value) { if (PACKET_PROFILE) { var s = new Error().stack.split("\n"); for (var i=1;i<s.length && i<10;i++) pp[s[i]] = (pp[s[i]]||0) + 4; } this.impl.writeFloatBE  (value, this.offset  , true); this.offset += 4; };
	BufferPacket.prototype.writeFloat64= function(value) { if (PACKET_PROFILE) { var s = new Error().stack.split("\n"); for (var i=1;i<s.length && i<10;i++) pp[s[i]] = (pp[s[i]]||0) + 8; } this.impl.writeDoubleBE (value, this.offset  , true); this.offset += 8; };
	
	BufferPacket.prototype.getDelivery = function() {
//		console.log("getDelivery to ",this.offset," length=",this.impl.length," of ",this.impl);
		var result = new Buffer(this.offset);
		this.impl.copy(result, 0, 0, this.offset);
		return result;
	};
	
	bserializer.BufferPacket = BufferPacket;
}

function createPacket(d) {
	if (typeof d === 'number') {
		if (have_BufferPacket) {
			d = new Buffer(d);
		}
		else {
			d = new ArrayBuffer(d);
		}
	}
	if (typeof d === 'object' && d !== null) {
		if (have_BufferPacket && d instanceof Buffer) {
			return new BufferPacket(d);
		}
		else if (d instanceof ArrayBuffer) {
			return new Packet(d);
		}
	}
	throw "Unrecognised input to create packet from: " + d;
}
bserializer.createPacket = createPacket;

//var packet = createPacket(640 << 10);
var packet = createPacket(10 << 20);

var unannotatedRegistrations = [];
var registrationsByIndex = [];
var registrationsByName = {};

bserializer.registrationsByIndex = registrationsByIndex;

function registerClass(config) {
	var config;
	
	if (typeof config === 'function') {
		var ctor = config;
		if (typeof arguments[1] === 'object') {
			if (Array.isArray(arguments[1])) {
				config = {fields:arguments[1]};
			}
			else {
				config = arguments[1] || {};
			}
		}
		else {
			config = {};
		}
		config.ctor = ctor;
		config = new ObjectConfig(config);
	}
	config.index = registrationsByIndex.length;
	if (config.noAnnotate) {
		unannotatedRegistrations.push(config);
	}
	else if (config.ctor) {
		config.ctor.$bserializerclassid = config.index;
	}
	if (config.name) {
		registrationsByName[config.name] = config;
	}
	registrationsByIndex.push(config);
}
bserializer.registerClass = registerClass;

function expand_template() {
	var strings = [];
	var replacements = {};
	for (var i = 0; i < arguments.length; i++) {
		var arg = arguments[i];
		//Strings are the templates
		if (typeof arg === 'string') {
			if (typeof strings === 'undefined') strings = [];
			strings.push(arg);
		}
		else if (Array.isArray(arg)) {
			if (typeof strings === 'undefined') strings = arg;
			else strings = strings.concat(arg);
		}
		else if (typeof arg === 'object') {
			for (var k in arg) {
				replacements[k] = arg[k];
			}
		}
	}
	for (var i = 0, l = strings.length; i < l; i++) {
		for (var k in replacements) {
			strings[i] = strings[i].replace(new RegExp('@'+k+'\\b@?', 'g'), arg[k]);
		}
	}
	return strings;
}

function array_append(a1, a2) {
	a1.splice.apply(a1, [a1.length, 0].concat(a2));
}

function for_each(a, f) {
	for (var i = 0, l = a.length; i < l; i++) f(a[i]);
}
function map(a, f) {
	var r = []; r.length = a.length;
	for (var i = 0, l = a.length; i < l; i++) r[i] = f(a[i]);
	return r;
}

function BaseConfig(name) {
	this.name = name;
	this.index = -1;
}
BaseConfig.prototype.equals = function (self, other) {
	return self === other;
};

function LiteralConfig(name, value) {
	BaseConfig.call(this, name);
	this.value = value;
}
LiteralConfig.prototype = new BaseConfig();
LiteralConfig.prototype.constructor = LiteralConfig;
LiteralConfig.prototype.makeTypeCheck = function(variable) {
	return variable + ' === ' + this.value;
};
LiteralConfig.prototype.read = function () {
	return this.value;
};
LiteralConfig.prototype.write = function () {
};
LiteralConfig.prototype.copy = function () {
	return this.value;
};
LiteralConfig.prototype.makeWriteReadExpansion = function(writes, reads, src, dst) {
	reads.push(dst + ' = ' + this.value + ';');
};

function PrimitiveConfig(name, config) {
	BaseConfig.call(this, name);
	for (var field in config) {
		this[field] = config[field];
	}
}
PrimitiveConfig.prototype = new BaseConfig();
PrimitiveConfig.prototype.constructor = PrimitiveConfig;

PrimitiveConfig.prototype.copy = function(dst, src) {
	return src;
};

PrimitiveConfig.prototype.makeTypeCheck = function (variable) {
	return "typeof " + variable + " === 'number'";
};
PrimitiveConfig.prototype.makeWriteReadExpansion = function(writes, reads, src, dst) {
	writes.push("p.write" + this.typeCapitalised() + "(" + src + ");");
	reads.push(dst + " = p.read" + this.typeCapitalised() + "();");
};

PrimitiveConfig.prototype.typeCapitalised = function() {
	return this.name.charAt(0).toUpperCase() + this.name.slice(1);
};

PrimitiveConfig.prototype.makeExpansions = function() {
	var expansion = {Type:this.typeCapitalised()};
	return {
		write: expand_template(
			"function write@Type(p, src) {",
			"	p.write@Type(src);",
			"}",
			expansion),
		read: expand_template(
			"function read@Type(p) {",
			"	return p.read@Type();",
			"}",
			expansion)
	};
};


function ObjectConfig(config) {
	BaseConfig.call(this, config.name);
	
	if (config == null) {
		config = {};
	}
	
	if (config.fields) {
		var fixedFields = [];
		fixedFields.length = config.fields.length;
		for (var fieldIndex = 0 ; fieldIndex < config.fields.length; fieldIndex++) {
			var fieldConfig = config.fields[fieldIndex];
			if (typeof fieldConfig === 'string') {
				fieldConfig = {name:fieldConfig, type:'generic'};
			}
			else if (!fieldConfig.type) {
				fieldConfig.type = 'generic';
			}
			fixedFields[fieldIndex] = fieldConfig;
		}
		this.fields = fixedFields;
	}
	else if (config.not) {
		if (Array.isArray(config.not)) {
			var objectNot = {};
			for (var notIndex = 0; notIndex < config.not.length; notIndex++) {
				objectNot[config.not[notIndex]] = true;
			}
			this.not = objectNot;
		}
		else {
			this.not = config.not;
		}
	}
	
	for (var field in config) {
		if (field !== 'not' && field !== 'fields') {
			this[field] = config[field];
		}
	}
}
ObjectConfig.prototype = new BaseConfig();
ObjectConfig.prototype.constructor = ObjectConfig;

var equals_path = [];

function equalsOffset(self, other, offset) {
	var equals = true;
	equals_path.push(offset);
	if (!equalsGeneric(self[offset], other[offset])) {
		console.warn("Inequal:", equals_path.join('.'), self[offset], "!=", other[offset]);
		equals = false;
	}
	equals_path.pop();	
	return equals;
}

ObjectConfig.prototype.equals = function (self, other) {
	if (self === other) return true;
	var equals = true;
	
	if (this.ctor_args) {
		for (var idx = 0; idx < this.ctor_args.length ; idx ++ ) {
			var f = this.ctor_args[idx];
			if (!equalsOffset(self, other, f)) equals = false;
		}
	}
	if (this.fields != null) {
		for (var i = 0, l = this.fields.length; i < l; i++) {
			var field = this.fields[i];
			if (!(this.ctor_args && this.ctor_args.indexOf(field.name) !== -1)) {
				var f = field.name;
				if (!equalsOffset(self, other, f)) equals = false;
			}
		}
	}
	else {
		for (var f in other) {
			if (typeof other[f] !== 'function' && !(this.not && (f in this.not)) && !(this.ctor_args && this.ctor_args.indexOf(f) !== -1)) {
				if (!equalsOffset(self, other, f)) equals = false;
			}
		}
	}
	return equals;
};

ObjectConfig.prototype.write = function(p, src, objectdb) {
	console.log("Writing @"+p.offset+": "+JSON.stringify(this));
	if (this.circular) {
		var b_already_written = typeof src.$bserializer_writeIndex !== 'undefined';
		p.writeBoolean(b_already_written);
		if (b_already_written) {
			p.writeSmartUint(src.$bserializer_writeIndex);
			return;
		}
		else {
			src.$bserializer_writeIndex = objectdb.length;
			objectdb.push(src);
		}
	}
	this.writeCtorArgs(p, src, objectdb);
	this.writeFields(p, src, objectdb);
};
ObjectConfig.prototype.writeCtorArgs = function (p, src, objectdb) {
	if (this.ctor_args) {
		for (var idx = 0; idx < this.ctor_args.length ; idx ++ ) {
			var f = this.ctor_args[idx];
			writeGeneric(p, src[f], objectdb);
		}
	}
};
ObjectConfig.prototype.writeFields = function (p, src, objectdb) {
	if (this.fields != null) {
		for (var i = 0, l = this.fields.length; i < l; i++) {
			var field = this.fields[i];
			if (!(this.ctor_args && this.ctor_args.indexOf(field.name) !== -1)) {
				var f = field.name;
				writeGeneric(p, src[f], objectdb);
			}
		}
	}
	else {
		var n = 0;
		for (var f in src) {
			if (f !== '$bserializer_writeIndex' && typeof src[f] !== 'function' && !(this.not && (f in this.not)) && !(this.ctor_args && this.ctor_args.indexOf(f) !== -1)) {
				n++;
			}
		}
		p.writeSmartUint(n);
		for (var f in src) {
			if (f !== '$bserializer_writeIndex' && typeof src[f] !== 'function' && !(this.not && (f in this.not)) && !(this.ctor_args && this.ctor_args.indexOf(f) !== -1)) {
				p.writeString(f);
				writeGeneric(p, src[f], objectdb);
			}
		}
	}
};

ObjectConfig.prototype.readCtorArgs = function(p, dst, objectdb) {
	if (this.ctor_args) {
		var values = [];
		values.length = this.ctor_args.length;
		for (var idx = 0; idx < this.ctor_args.length ; idx ++ ) {
			var arg_field = this.ctor_args[idx];
			values[idx] = readGeneric(p, dst != null ? dst[arg_field] : null, objectdb);
		}
		return values;
	}
};

ObjectConfig.prototype.read = function(p, dst, objectdb) {
	if (this.circular) {
		var b_already_written = p.readBoolean();
		if (b_already_written) {
			var reference = p.readSmartUint();
			dst = objectdb[reference];
//			console.log("read circular object @", reference, this.name || this.ctor.name || this.index);
			return dst;
		}
	}
	if (this.ctor) {
		if (this.ctor_args) {
			var ctor_values = this.readCtorArgs(p, dst, objectdb);
			if (dst == null || dst.constructor !== this.ctor) {
				dst = Object.create(this.ctor.prototype);
				this.ctor.apply(dst, ctor_values);
				var ctor_output = this.ctor.apply(dst, ctor_values);
				if (Object(ctor_output) === ctor_output) {
					dst = ctor_output;
				}
			}
			else {
				for (var i = 0, l = this.ctor_args.length; i < l; i++) {
					dst[this.ctor_args[i]] = ctor_values[i];
				}
			}
		}
		else {
			if (dst == null || dst.constructor !== this.ctor) {
				dst = new this.ctor();
			}
		}
	}
	else if (dst === null || typeof dst !== 'object') {
		dst = {};
	}
	if (this.circular) {
		objectdb.push(dst);
//		console.log("read new circular ref @", reference, this.name || this.ctor.name || this.index);
	}
	this.readFields(p, dst, objectdb);
	return dst;
};

ObjectConfig.prototype.readFields = function(p, dst, objectdb) {
	if (this.fields != null) {
		for (var i = 0, l = this.fields.length; i < l; i++) {
			var field = this.fields[i];
			if (!(this.ctor_args && this.ctor_args.indexOf(field.name) !== -1)) {
				dst[field.name] = readGeneric(p, dst[field.name], objectdb);
			}
		}
	}
	else {
		var n = p.readSmartUint();
		var removals = {};
		for (var f in dst) {
			if (typeof dst[f] !== 'function') {
				removals[f] = true;
			}
		}
		while (n-- > 0) {
			var f = p.readString();
			dst[f] = readGeneric(p, dst[f], objectdb);
			delete removals[f];
		}
		for (var f in removals) {
			delete dst[f];
		}
	}
};

ObjectConfig.prototype.getCopyCircular = function(dst, src) {
	return src != null && src.$bserializer_copydst;
};

ObjectConfig.prototype.setCopyCircular = function(dst, src, objectdb) {
	src.$bserializer_copydst = dst;
	objectdb.push(src);
};

ObjectConfig.prototype.copy = function (dst, src, objectdb) {
	if (this.circular) {
		var dst_orig = this.getCopyCircular(dst, src);
		if (dst_orig != null) {
			return dst_orig;
		}
	}
	if (dst == null || src.constructor !== dst.constructor) {
		if (this.ctor_args) {
			var params = [];
			for (var argIndex = 0; argIndex < this.ctor_args.length ; argIndex++) {
				var arg_field = this.ctor_args[argIndex];
				var arg_value;
				if (arg_field in src) {
					arg_value = src[arg_field];
				}
				params.push(arg_value);
			}
			//Need to be able to call constructors with specific deserialized parameters.... !?
			dst = Object.create(this.ctor.prototype);
			var ctor_output = this.ctor.apply(dst, params);
			if (Object(ctor_output) === ctor_output) {
				dst = ctor_output;
			}
		}
		else {
			dst = new this.ctor();
		}
	}
	if (this.circular) {
		this.setCopyCircular(dst, src, objectdb);
	}
	this.copyFields(dst, src, objectdb);
	return dst;
};

ObjectConfig.prototype.copyFields = function (dst, src, objectdb) {
	var fieldName;
	for (fieldName in src) {
		if (fieldName !== '$bserializer_copydst' && typeof src[fieldName] !== 'function' && (typeof this.not === 'undefined' || !(fieldName in this.not))) {
			dst[fieldName] = copyGeneric(dst[fieldName], src[fieldName], objectdb);
		}
	}
	for (fieldName in dst) {
		if (!(fieldName in src) && typeof dst[fieldName] !== 'function' && (typeof this.not === 'undefined' || !(fieldName in this.not))) {
			delete dst[fieldName];
		}
	}
};

ObjectConfig.prototype.makeExpansions = function() {
	var bodies = {
		copy:[],
		writeFields:[],
		readFields:[]
	};
	
	bodies.writeFields.push("console.log('Writing fields for " + JSON.stringify(this)+"');");
	
	if (this.circular) {
		bodies.copy.push('var dst_orig = this.getCopyCircular(dst, src, objectdb);');
		bodies.copy.push("if (typeof dst_orig !== 'undefined') return dst_orig;");
	}

	function output_copy_direct(field) {
		bodies.copy.push('dst.' + field.name + ' = src.' + field.name + ';');
	}
	function output_copy_generic(field) {
		bodies.copy.push('dst.' + field.name + ' = bserializer.copyGeneric(dst.' + field.name + ', src.' + field.name + ', objectdb);');
	}
	
	function output_copy_by_type(field) {
		if (field.type.$bserializerclassid in registrationsByIndex) {
			output_copy_generic(field);
		}
		else if (typeof field.type === 'string') {
			switch (field.type) {
				case 'boolean':
				case 'int8':
				case 'int16':
				case 'int32':
				case 'uint8':
				case 'uint16':
				case 'uint32':
				case 'float32':
				case 'float64':
				case 'string':
					output_copy_direct(field);
					break;
				case 'array-rle':
				case 'array':
				case 'generic':
					output_copy_generic(field);
					break;
				default:
					throw "Unknown field type " + field.type;
			}
		}
	}

	bodies.copy.push('if (dst == null) {');
	var ctor_params = [];
	if (this.ctor_args) {
		for (var ci = 0 ; ci < this.ctor_args.length; ci++) {
			ctor_params.push('src.' + this.ctor_args[ci]);
		}
	}

	bodies.copy.push('	dst=new this.ctor(' + ctor_params.join(',') + ');');
	var any_static = false;
	if (this.fields) {
		for_each(this.fields, function(field) {
			if (field.static) {
				output_copy_by_type(field);
				any_static = true;
			}
		});
	}
	bodies.copy.push('}');
	if (any_static) {
		bodies.copy.push('else {');
		for_each(this.fields, function(field) {
			if (field.static) {
				output_copy_direct(field);
			}
		});
		bodies.copy.push('}');
	}
	if (this.circular) {
		bodies.copy.push('this.setCopyCircular(dst, src, objectdb);');
	}
	var read_write_written = {};
	function output_field_write_read(writes, reads, field, ctor_mode) {
		if (field.name in read_write_written) return;
		read_write_written[field.name] = true;
		var read_dst;
		if (ctor_mode) {
			read_dst = gensym(field.name);
			reads.push('var ' + read_dst + ';');
			reads.push('if (dst != null) ' + read_dst + ' = dst.' + field.name + ';');
		}
		else {
			read_dst = 'dst.' + field.name;
		}
		makeWriteReadExpansions(writes, reads, 'src.' + field.name, read_dst, field);
		return read_dst;
	}
	if (this.ctor_args) {
		var fields = this.fields;
		bodies.writeCtorArgs = [];
		bodies.readCtorArgs = [];
		var read_dsts = map(this.ctor_args, function (ctor_arg_name) {
			var read_dst;
			if (fields) {
				for (var i = 0, l = fields.length; i < l; i++) {
					var field = fields[i];
					if (field === ctor_arg_name || field.name === ctor_arg_name) {
						read_dst = output_field_write_read(bodies.writeCtorArgs, bodies.readCtorArgs, field, true);
						break;
					}
				}
			}
			if (typeof read_dst === 'undefined') {
				read_dst = output_field_write_read(bodies.writeCtorArgs, bodies.readCtorArgs, {name:ctor_arg_name, type:'generic'}, true);
			}
			return read_dst;
		});
		bodies.readCtorArgs.push('return [' + read_dsts.join(',') + '];');
	}
	if (this.fields) {
		for_each(this.fields, function(field) {
			if (!field.static) {
				output_copy_by_type(field);
			}
			output_field_write_read(bodies.writeFields, bodies.readFields, field);
		});
	}
	else {
		bodies.copy.push('this.copyFields(dst, src, objectdb);');
	}
	bodies.copy.push('return dst;');
//	console.log("Expanding copy for ", this);
	var function_suffix = this.index + this.ctor.name;
	var expansions ={
		copy: "function copy" + function_suffix + "(dst,src,objectdb) {\n\t\t" + bodies.copy.join("\n\t\t") + "}"
	};
	if (this.ctor_args) {
		expansions.writeCtorArgs = "function writeCtorArgs" + function_suffix + "(p,src,objectdb) {\n\t\t" + bodies.writeCtorArgs.join("\n\t\t") + "}";
		expansions.readCtorArgs = "function readCtorArgs" + function_suffix + "(p,dst,objectdb) {\n\t\t" + bodies.readCtorArgs.join("\n\t\t") + "}";
	}
	if (this.fields) {
		expansions.writeFields = "function writeFields" + function_suffix + "(p,src,objectdb) {\n\t\t" + bodies.writeFields.join("\n\t\t") + "}";
		expansions.readFields = "function readFields" + function_suffix + "(p,dst,objectdb) {\n\t\t" + bodies.readFields.join("\n\t\t") + "}";
	}
	return expansions;
};

ObjectConfig.prototype.makeWriteReadExpansion = function (writes, reads, write_src, read_dst) {
	writes.push("bserializer.registrationsByIndex["+this.index+"].write(p, " + write_src + ", objectdb);");
	reads.push(read_dst + " = bserializer.registrationsByIndex["+this.index+"].read(p, " + read_dst + ", objectdb);");
};
	
function getTypeConfig(field_type) {
	var config;
	if (field_type.$bserializerclassid in registrationsByIndex) {
		config = registrationsByIndex[field_type.$bserializerclassid];
	}
	else if (field_type in registrationsByName) {
		config = registrationsByName[field_type];
	}
	else if (field_type in registrationsByIndex) {
		config = registrationsByIndex[field_type];
	}
	return config;
}

function makeWriteReadExpansions(writes, reads, src, dst, field) {
	writes.push("console.log('Writing " + src + "');");
	if (field && Array.isArray(field.type)) {
		var configs = map(field.type, getTypeConfig);
		reads.push('switch (p.readUint8()) {');
		for (var i = 0, l = configs.length; i < l; i++) {
			var config = configs[i];
			
			var type_check;
			if (config.makeTypeCheck) {
				type_check = config.makeTypeCheck(src);
			}
			else {
				type_check = src + ' != null && ' + src + '.constructor === this.ctor';
			}
			
			writes.push((i > 0 ? 'else if' : 'if') + " (" + type_check + ") {");
			writes.push("\tp.writeUint8(" + i + ");");
			reads.push('\tcase ' + i + ':');
			config.makeWriteReadExpansion(writes, reads, src, dst, field);
			writes.push("}");
			reads.push("\t\tbreak;");
		}

		writes.push("else {");
		writes.push("\tthrow 'Unhandled type on write';");
		writes.push('}');

		reads.push("\tdefault:");
		reads.push("\t\tthrow 'Unhandled type on read';");
		reads.push('}');
	}
	else {
		var config = field && field.type && getTypeConfig(field.type);
		if (config && config.makeWriteReadExpansion) {
			config.makeWriteReadExpansion(writes, reads, src, dst, field);
		}
		else {
			writes.push("bserializer.writeGeneric(p, " + src + ", objectdb);");
			reads.push(dst + " = bserializer.readGeneric(p, " + dst + ", objectdb);");
		}
	}
}

function ArrayConfig(name, properties) {
	BaseConfig.call(this, name);
	this.rle = false;
	if (properties) for (var prop in properties) {
		this[prop] = properties[prop];
	}
}
ArrayConfig.prototype = new BaseConfig();
ArrayConfig.prototype.constructor = ArrayConfig;

ArrayConfig.prototype.equals = function(self, other) {
	if (!Array.isArray(other)) {
		console.warn(equals_path.join('.') + " not an array");
		return false;
	}
	if (self.length !== other.length) {
		console.warn(equals_path.join('.') + " array length mismatch ", self.length, "!=", other.length);
		return false;
	}
	var equals = true;
	for (var i = 0, l = self.length; i < l ; i++) {
		if (!equalsOffset(self, other, i)) {
			equals = false;
		}
	}
	return equals;
};

ArrayConfig.prototype.write = function(p, src, objectdb) {
	p.writeSmartUint(src.length);
	for (var i = 0, l = src.length; i < l; i++) {
		writeGeneric(p, src[i], objectdb);
	}
};


ArrayConfig.prototype.makeWriteReadExpansion = function (write, read, write_src, read_dst, field) {
	
	var i = gensym('i');
	var l = gensym('l');
	var src = gensym(write_src);
	var el_src = gensym(src + '_' + i);
	var rl = gensym('rl');
	var element_write = [];
	var element_read = [];
	
	makeWriteReadExpansions(element_write, element_read, el_src, read_dst + '[' + i + ']', field.element);
	
	if (this.rle) {
		array_append(write, expand_template(
				"var @rl = 0;",
				"var @src = @src_expr, @l = @src.length, @el_src;",
				"p.writeSmartUint(@l);",
				"for (var @i = 0; @i < @l; @i++) {",
				"	if (@i === 0) {",
				"		@el_src = @src[@i];",
				"	}",
				"	else if (@src[@i] === @el_src) {",
				"		@rl++;",
				"	}",
				"	else {",
				'		console.log("Writing x" + @rl + " (up to " + @i + "/" + @l + ") of " + @el_src);',
				"		p.writeSmartUint(@rl);",
				element_write,
				'		@el_src = @src[@i];',
				'		@rl = 0;',
				"	}",
				"}",
				{
					el_src:el_src,
					src:src,
					src_expr:write_src,
					i:i,
					l:l,
					rl:rl
				}
			));
	}
	else {
		array_append(write, expand_template(
				"var @src = @src_expr, @l = @src.length, @el_src;",
				"p.writeSmartUint(@l);",
				"for (var @i = 0; @i < @l; @i++) {",
				'	@el_src = @src[@i];',
				'	console.log("Writing " + @i + "/" + @l + ": " + @el_src);',
				element_write,
				"}",
				{
					el_src:el_src,
					src:src,
					src_expr:write_src,
					i:i,
					l:l
				}
			));
	}
			
	if (this.sparse) {
		write.push("p.writeSmartUint(@rl);");
		write.push("p.writeSmartUint(@rv);");
	}
			
	array_append(read, expand_template(
			"var @l = p.readSmartUint();",
			"if (@dst == null || @dst.length !== @l) {",
			"	@dst = [];",
			"	@dst.length = @l;",
			"}",
			"for (var @i = 0; @i < @l; @i++) {",
			element_read,
			"}",
			{
				dst:read_dst,
				i:i,
				l:l
			}
		));
};

ArrayConfig.prototype.read = function(p, dst, objectdb) {
	var l = p.readSmartUint();
	if (dst == null || dst.length !== l) {
		dst = [];
		dst.length = l;
	}
	for (var i = 0; i < l ; i++) {
		dst[i] = readGeneric(p, dst[i], objectdb);
	}
	return dst;
};

ArrayConfig.prototype.makeReadExpansion = function (dst, field) {
};

ArrayConfig.prototype.copy = function (dst, src, objectdb) {
	if (!Array.isArray(dst)) {
		dst = [];
	}
	dst.length = src.length;
	for (var i = 0 ; i < src.length; i++) {
		var src_value = src[i];
		if (typeof src_value !== 'function') {
			dst[i] = copyGeneric(dst[i], src_value, objectdb);
		}
	}
	return dst;
};

function TypedArrayConfig(prefix) {
	BaseConfig.call(this, prefix + 'Array');
	this.ctor = global[prefix + 'Array'];
	this.prefix = prefix;
	this.noAnnotate = true;
}
TypedArrayConfig.prototype = new BaseConfig();
TypedArrayConfig.prototype.constructor = TypedArrayConfig;

TypedArrayConfig.prototype.makeExpansions = function() {
	var expansion = {
		Prefix: this.prefix
	};
	return {
		write: expand_template(
			"function write@Prefix(p,src) {",
			"	var l = src.length;",
			"	p.writeSmartUint(l);",
			"	for (var i = 0; i < l ; i++) {",
			"		p.write@Prefix(src[i]);",
			"	}",
			"}",
			expansion),
		read: expand_template(
			"function read@Prefix(p,dst) {",
			"	var l = p.readSmartUint();",
			"	if (dst == null || dst.constructor !== @Prefix@Array || dst.length !== l) {",
			"		dst = new @Prefix@Array(l);",
			"	}",
			"	for (var i = 0; i < l ; i++) {",
			"		dst[i] = p.read@Prefix();",
			"	}",
			"	return dst;",
			"}",
			expansion),
		copy: expand_template(
			"function copy@Prefix(dst,src,objectdb) {",
			"	if (src == null) {",
			"		dst = src;",
			"	}",
			"	else if (dst == null || dst.constructor !== @Prefix@Array || dst.length !== src.length) {",
			"		dst = new @Prefix@Array(src);",
			"	}",
			"	else {",
			"		dst.set(src);",
			"	}",
			"	return dst;",
			"}",
			expansion)};
};


registerClass(new LiteralConfig('undefined'));
registerClass(new LiteralConfig('null', null));
registerClass(new LiteralConfig('false', false));
registerClass(new LiteralConfig('true', true));

registerClass(new PrimitiveConfig('string', {
	makeTypeCheck: function (variable) {
		return "typeof " + variable + " === 'string'";
	}
}));
registerClass(new PrimitiveConfig('float64'));
registerClass(new PrimitiveConfig('int8'));
registerClass(new PrimitiveConfig('uint8'));
registerClass(new PrimitiveConfig('int16'));
registerClass(new PrimitiveConfig('uint16'));
registerClass(new PrimitiveConfig('int32'));
registerClass(new PrimitiveConfig('uint32'));
registerClass(new PrimitiveConfig('float32'));
registerClass(new PrimitiveConfig('smartuint', {
	typeCapitalised : function() {
		return 'SmartUint';
	}
}));

registerClass(new ObjectConfig({name:'object', noAnnotate:true, noExpand:true}));
registerClass(new ArrayConfig('array'));
registerClass(new ArrayConfig('array-rle', {rle:true}));

registerClass(new TypedArrayConfig("Int8"));
registerClass(new TypedArrayConfig("Uint8"));
registerClass(new TypedArrayConfig("Int16"));
registerClass(new TypedArrayConfig("Uint16"));
registerClass(new TypedArrayConfig("Int32"));
registerClass(new TypedArrayConfig("Uint32"));
registerClass(new TypedArrayConfig("Float32"));
registerClass(new TypedArrayConfig("Float64"));

//registerClass(ArrayBuffer, {
//	noAnnotate:true,
//	copy: function(dst, src) {
//		if (dst != null && dst instanceof ArrayBuffer) {
//			new Uint8Array(dst).set(new Uint8Buffer(src));
//		}
//		else {
//			dst = src.slice(0);
//		}
//		return dst;
//	},
//	write: function(p, src) {
//		var view = Uint8Array(src);
//		p.writeUint32(view.length);
//		for (var i = 0, l = view.length; i < l ; i++) {
//			p.writeUint8(view[i]);
//		}
//	},
//	read: function(p, dst) {
//		var l = p.readUint32(view.length);
//		if (dst == null || !(dst instanceof ArrayBuffer)) {
//			dst = new ArrayBuffer(l);
//		}
//		var view = Uint8Array(dst);
//		for (var i = 0, l = view.length; i < l ; i++) {
//			p.writeUint8(view[i]);
//		}
//		return dst;
//	}
//});


bserializer.finishExpansions = function(file) {
	var fs = require('fs');
	var out = fs.openSync(file, 'w');

	var idx,func;
	fs.writeSync(out, "(function(bserializer) {\n\n");
	
	for (var idx = 0; idx < registrationsByIndex.length; idx++) {
		var config = registrationsByIndex[idx];
		if (config.makeExpansions && !config.noExpand) {
			var expansions = config.makeExpansions();
			var s = [];
			for (func in expansions) {
				var expansion = expansions[func];
				if (Array.isArray(expansion)) {
					expansion = expansion.join("\n\t");
				}
				if (expansion) {
					s.push(func+':'+expansion);
				}
			}
			fs.writeSync(out, 'bserializer.addExpansions(' + idx + ', {\n\t' + s.join(",\n\t") + "\n\t});\n\n");
		}
	}
	
	fs.writeSync(out, "})(typeof bserializer === 'undefined' ? require('bserializer') : bserializer);");
	fs.closeSync(out);
	require(file);
};

bserializer.addExpansions = function addExpansions(index, expansions){
	for (var expansion_name in expansions) {
		registrationsByIndex[index][expansion_name] = expansions[expansion_name];
	}
};

function detectConfig(src) {
	var config = null;
	switch (typeof src) {
		case 'function':
			break;
		case 'undefined':
			config = registrationsByName.undefined;
			break;
		case 'number':
			config = registrationsByName.float64;
			break;
		case 'string':
			config = registrationsByName.string;
			break;
		case 'boolean':
			if (src === true) {
				config = registrationsByName.true;
			}
			else {
				config = registrationsByName.false;
			}
			break;
		case 'object':
			if (src === null) {
				config = registrationsByName.null;
			}
			else if (src.constructor && typeof src.constructor.$bserializerclassid !== 'undefined') {
				config = registrationsByIndex[src.constructor.$bserializerclassid];
			}
			else {
				get_config: {
					for (var i = 0, l = unannotatedRegistrations.length; i < l; i++) {
//						src.constructor !== Object && src.constructor !== Array &&
//						console.log("Checking constructor ", src.constructor, unannotatedRegistrations[i].ctor);
						if (src.constructor === unannotatedRegistrations[i].ctor) {
							config = unannotatedRegistrations[i];
							break get_config;
						}
					}
					if (Array.isArray(src)) {
						config = registrationsByName.array;
					}
					else {
						config = registrationsByName.object;
					}
				}
			}
			break;
	}
	return config;
}

function copyGeneric(dst, src, objectdb) {
	var top_level = typeof objectdb === 'undefined';
	if (top_level) {
		objectdb = [];
	}
	var config = detectConfig(src);
//	if (debug) console.log("config=",config);
	if (config) {
		dst = config.copy(dst, src, objectdb);
	}
	if (top_level) {
		for (var i = 0, l = objectdb.length; i < l; i++) {
			delete objectdb[i].$bserializer_copydst;
		}
	}
	return dst;
}
bserializer.copyGeneric = copyGeneric;

function equalsGeneric(self, other) {
	return detectConfig(self).equals(self, other);
}
bserializer.readGeneric = readGeneric;

function writeGeneric(p, src, objectdb) {
	var top_level = typeof objectdb === 'undefined';
	if (top_level) {
		objectdb = [];
	}
	var config = detectConfig(src);
	if (config) {
		p.writeSmartUint(config.index);
		if (config.write != null) {
			config.write(p, src, objectdb);
		}
	}
	else if (typeof src !== 'function') {
		console.warn("Failed to get config of ", require('util').inspect(src));
	}
	if (top_level) {
		for (var i = 0, l = objectdb.length; i < l; i++) {
			delete objectdb[i].$bserializer_writeIndex;
		}
	}
}
bserializer.writeGeneric = writeGeneric;

function readGeneric(p, dst, objectdb) {
	var top_level = typeof objectdb === 'undefined';
	if (top_level) {
		objectdb = [];
	}
	var index = p.readSmartUint();
	var config = registrationsByIndex[index];
	if (config.read != null) {
		dst = config.read(p, dst, objectdb);
	}
	return dst;
}
bserializer.readGeneric = readGeneric;

function serialize(obj) {
	if (PACKET_PROFILE) pp = {};
	packet.offset = 0;
	bserializer.writeGeneric(packet, obj);
	if (PACKET_PROFILE) {
		var a = [];
		for (var s in pp) {
			a.push([pp[s],s]);
		}
		a.sort(function (a,b){
			return b[0] - a[0];
		});
		console.log("serialize bytes=" + packet.offset, a);
	}
	return packet.getDelivery();
}

bserializer.serialize = serialize;

function deserialize(buffer, obj) {
	var packet = createPacket(buffer);
	obj = bserializer.readGeneric(packet, obj);
//	console.log("deserialize read=" + packet.offset + "/" + (packet.impl.length || packet.impl.byteLength), obj);
	return obj;
}

bserializer.deserialize = deserialize;

})(typeof exports === 'undefined'? this.bserializer = {}: exports);
