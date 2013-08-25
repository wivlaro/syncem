(function(bserializer) {

if (typeof global === 'undefined' && typeof window !== 'undefined') {
	window.global = window;
}

function array_append(a1, a2) {
	a1.push.apply(a1, a2);
};

function for_each(a, f) {
	for (var i = 0, l = a.length; i < l; i++) f(a[i], i);
};

function map(a, f) {
	var r = []; r.length = a.length;
	for (var i = 0, l = a.length; i < l; i++) r[i] = f(a[i]);
	return r;
};

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
		else if (typeof arg === 'object' && arg !== null) {
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
};

function indent(indentation, strings) {
	return map(strings, function (string) {
		return indentation + string;
	});
};


function Packet(arrayBuffer) {
	this.impl = new DataView(arrayBuffer);
	this.offset = 0;
}

Packet.prototype.reset = function () {
	this.offset = 0;
};

Packet.prototype.getDelivery = function() {
	return this.impl.buffer.slice(0, this.offset);
};

var PACKET_PROFILE = false;
var GEN_VERBOSITY = {
	object:false,
	field:false,
	rle:false
};
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
Packet.prototype.writeBoolean = function(value) { this.writeUint8(value ? 1 : 0); return value; };

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
	console.trace();
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
		var chr = this.readUint8();
		if (chr >= 0xc0) {
			if (chr < 0xe0) {
				chr = ((chr & 0x1f) << 6)
						+ (this.readUint8() & 0x3f);
			}
			else if (chr < 0xf0) {
				chr = ((chr & 0x0f) << 12)
						+ ((this.readUint8() & 0x3f) << 6)
						+ (this.readUint8() & 0x3f);
			}
			else if (chr < 0xf8) {
				chr = ((chr & 0x07) << 18)
						+ ((this.readUint8() & 0x3f) << 12)
						+ ((this.readUint8() & 0x3f) << 6)
						+ (this.readUint8() & 0x3f);
			}
			else if (chr < 0xfc) {
				chr = ((chr & 0x03) << 24)
						+ ((this.readUint8() & 0x3f) << 18)
						+ ((this.readUint8() & 0x3f) << 12)
						+ ((this.readUint8() & 0x3f) << 6)
						+ (this.readUint8() & 0x3f);
			}
			else {
				chr = ((chr & 0x01) << 30)
						+ ((this.readUint8() & 0x3f) << 24)
						+ ((this.readUint8() & 0x3f) << 18)
						+ ((this.readUint8() & 0x3f) << 12)
						+ ((this.readUint8() & 0x3f) << 6)
						+ (this.readUint8() & 0x3f);
			}
		}
		value += String.fromCharCode(chr);
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
	
	BufferPacket.prototype = new Packet(new ArrayBuffer(1));
	BufferPacket.prototype.constructor = BufferPacket;
	
	BufferPacket.prototype.readInt8   = function() { var value = this.impl.readInt8     (this.offset); this.offset++;    return value; };
	BufferPacket.prototype.readUint8  = function() { var value = this.impl.readUInt8    (this.offset); this.offset++;    return value; };
	BufferPacket.prototype.readInt16  = function() { var value = this.impl.readInt16BE  (this.offset); this.offset += 2; return value; };
	BufferPacket.prototype.readUint16 = function() { var value = this.impl.readUInt16BE (this.offset); this.offset += 2; return value; };
	BufferPacket.prototype.readInt32  = function() { var value = this.impl.readInt32BE  (this.offset); this.offset += 4; return value; };
	BufferPacket.prototype.readUint32 = function() { var value = this.impl.readUInt32BE (this.offset); this.offset += 4; return value; };
	BufferPacket.prototype.readFloat32= function() { var value = this.impl.readFloatBE  (this.offset); this.offset += 4; return value; };
	BufferPacket.prototype.readFloat64= function() { var value = this.impl.readDoubleBE (this.offset); this.offset += 8; return value; };
	
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
//		console.log("Registering config:",config.name);
		registrationsByName[config.name] = config;
	}
	registrationsByIndex.push(config);
}
bserializer.registerClass = registerClass;

function BaseConfig(name) {
	this.name = name;
	this.index = -1;
}
BaseConfig.prototype.equals = function (self, other) {
	var equal = self === other;
	if (!equal) {
		console.warn("Inequal:", equals_path.join('.'), self, "!=", other);
	}
	return equal;
};

BaseConfig.prototype.makeFieldExpansions = function (bodies, write_src, read_dst) {
	bodies.write.push("bserializer.writeGeneric(p, " + write_src + ", objectdb, writeOptions);");
	bodies.read.push(read_dst + " = bserializer.readGeneric(p, " + read_dst + ", objectdb);");
	bodies.copy.push(read_dst + " = bserializer.copyGeneric(" + read_dst + ", " + write_src + ", objectdb, copyOptions);");
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
LiteralConfig.prototype.makeFieldExpansions = function(bodies, src, dst) {
	bodies.read.push(dst + ' = ' + this.value + ';');
	bodies.copy.push(dst + ' = ' + this.value + ';');
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
PrimitiveConfig.prototype.makeFieldExpansions = function(bodies, src, dst) {
	bodies.write.push("p.write" + this.typeCapitalised() + "(" + src + ");");
	bodies.read.push(dst + " = p.read" + this.typeCapitalised() + "();");
	bodies.copy.push(dst + " = " + src + ";");
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
//			console.log((config.ctor ? config.ctor.name : this.constructor.name) + " adding config " + field);
			this[field] = config[field];
		}
	}
}
ObjectConfig.prototype = new BaseConfig();
ObjectConfig.prototype.constructor = ObjectConfig;

var equals_path = [];

function equalsOffset(self, other, offset, depth, objectdb) {
	var equals = true;
	equals_path[depth] = offset;
//	typeof offset === 'string' && console.log(equals_path.join('.'));
	if (!equalsGeneric(self[offset], other[offset], objectdb)) {
		equals = false;
	}
	return equals;
}

ObjectConfig.prototype.equals = function (self, other, objectdb) {
	if (self === other) return true;
	if (other == null) {
		console.warn(equals_path.join('.') + " failure, other == " + other);
		return false;
	}
	var equals = true;
	
	var depth = equals_path.length;
	if (this.ctor_args) {
		for (var idx = 0; idx < this.ctor_args.length ; idx ++ ) {
			var f = this.ctor_args[idx];
			if (!equalsOffset(self, other, f, depth, objectdb)) equals = false;
		}
	}
	if (this.fields != null) {
		for (var i = 0, l = this.fields.length; i < l; i++) {
			var field = this.fields[i];
			if (field.equals !== false && !(this.ctor_args && this.ctor_args.indexOf(field.name) !== -1)) {
				var f = field.name;
				if (!equalsOffset(self, other, f, depth, objectdb)) equals = false;
			}
		}
	}
	else {
		for (var f in other) {
			if (typeof other[f] !== 'function' && !(this.not && (f in this.not)) && !(this.ctor_args && this.ctor_args.indexOf(f) !== -1)) {
				if (!equalsOffset(self, other, f, depth, objectdb)) equals = false;
			}
		}
	}
	equals_path.length = depth;
	return equals;
};

ObjectConfig.prototype.write = function(p, src, objectdb, writeOptions) {
	var n = 0;
	if (writeOptions && writeOptions.objectFieldSort) {
		var fields = [];
		for (var f in src) {
			if (f !== '$bserializer_writeIndex'
					&& typeof src[f] !== 'function'
					&& !(this.not && (f in this.not))
					&& !(this.ctor_args && this.ctor_args.indexOf(f) !== -1)) {
				fields.push(f);
			}
		}
		fields.sort();
		p.writeSmartUint(fields.length);
		for (var i = 0,l=fields.length; i < l; i++) {
			var f = fields[i];
			p.writeString(f);
			writeGeneric(p, src[f], objectdb, writeOptions);
		}
	}
	else {
		for (var f in src) {
			if (f !== '$bserializer_writeIndex'
					&& typeof src[f] !== 'function'
					&& !(this.not && (f in this.not))
					&& !(this.ctor_args && this.ctor_args.indexOf(f) !== -1)) {
				n++;
			}
		}
		p.writeSmartUint(n);
		for (var f in src) {
			if (f !== '$bserializer_writeIndex'
					&& typeof src[f] !== 'function'
					&& !(this.not && (f in this.not))
					&& !(this.ctor_args && this.ctor_args.indexOf(f) !== -1)) {
				p.writeString(f);
				writeGeneric(p, src[f], objectdb, writeOptions);
			}
		}
	}
};

ObjectConfig.prototype.read = function(p, dst, objectdb) {
	if (this.ctor) {
		if (dst == null || dst.constructor !== this.ctor) {
			dst = new this.ctor();
		}
	}
	else if (dst === null || typeof dst !== 'object') {
		dst = {};
	}
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
	return dst;
};

ObjectConfig.prototype.getCopyCircular = function(dst, src) {
	return src != null && src.$bserializer_copydst;
};

ObjectConfig.prototype.setCopyCircular = function(dst, src, objectdb) {
	src.$bserializer_copydst = dst;
	objectdb.push(src);
};

ObjectConfig.prototype.copy = function (dst, src, objectdb, copyOptions) {
	if (dst == null) {
		dst = {};
	}
	var fieldName;
	for (fieldName in src) {
		if (fieldName !== '$bserializer_copydst' && typeof src[fieldName] !== 'function' && (typeof this.not === 'undefined' || !(fieldName in this.not))) {
			dst[fieldName] = copyGeneric(dst[fieldName], src[fieldName], objectdb, copyOptions);
		}
	}
	for (fieldName in dst) {
		if (!(fieldName in src) && typeof dst[fieldName] !== 'function' && (typeof this.not === 'undefined' || !(fieldName in this.not))) {
			delete dst[fieldName];
		}
	}
	return dst;
};

ObjectConfig.prototype.makeExpansions = function() {
	var bodies = {
		copy:[],
		write:[],
		read:[]
	};
	
	if (GEN_VERBOSITY.object) {
		bodies.write.push("console.log('Writing " + this.ctor.name + " @'+p.offset);");
		bodies.read.push("console.log('Reading " + this.ctor.name + " @'+p.offset);");
	}
	
	if (this.circular) {
		bodies.copy.push('var dst_orig = this.getCopyCircular(dst, src, objectdb);');
		bodies.copy.push("if (typeof dst_orig !== 'undefined') return dst_orig;");
		bodies.read.push(
			"var b_already_read = p.readBoolean();",
			"var n_reference;",
			"if (b_already_read) {",
			"	var n_reference = p.readSmartUint();",
			"	dst = objectdb[n_reference];",
//			'	console.log("read circular object @", n_reference, dst);',
			"	return dst;",
			"}",
			"else {",
			"	//Keep a placeholder, so constructor arguments don't take the slot",
			"	n_reference = objectdb.length;",
			"	objectdb.push(null);",
			"}");
		bodies.write.push(
			"var b_already_written = typeof src.$bserializer_writeIndex !== 'undefined';",
			"p.writeBoolean(b_already_written);",
			"if (b_already_written) {",
			"	p.writeSmartUint(src.$bserializer_writeIndex);",
			"	return;",
			"}",
			"else {",
//			'	console.log("wrote circular object @", objectdb.length, src);',
			"	src.$bserializer_writeIndex = objectdb.length;",
			"	objectdb.push(src);",
			"}");
	}
	
	var field_generated = {};
	function output_expansions(bodies, field, ctor_mode) {
		if (field.name in field_generated) return;
		field_generated[field.name] = true;
		
		var read_dst;
		if (ctor_mode) {
			read_dst = gensym(field.name);
			bodies.read.push('var ' + read_dst + ';');
			bodies.copy.push('var ' + read_dst + ';');
			var field_config = field.type && getTypeConfig(field.type);
			if (!(field_config instanceof PrimitiveConfig) && !(field_config instanceof LiteralConfig)) {
				bodies.copy.push('if (dst != null) ' + read_dst + '=dst.' + field.name + ';');
			}
		}
		else {
			read_dst = 'dst.' + field.name;
		}

		if (field.serialize === false || field.directCopy === true) {
			//Override bodies object, with read/write that will get discarded
			var bodiesSaved = bodies;
			bodies = {};
			for (var method in bodiesSaved) {
				var lines = bodiesSaved[method];
				switch (method) {
					case 'read':
					case 'write':
						if (field.serialize === false) {
							lines = [];
						}
						break;
					case 'copy':
						if (field.directCopy === true) {
							lines.push(read_dst + '=src.' + field.name + ';');
							lines = [];
						}
						break;
				}
				bodies[method] = lines;
			}
		}
		else if (GEN_VERBOSITY.field) {
			bodies.write.push("console.log('	Writing " + field.name + " @'+p.offset);");
			bodies.read.push("console.log('	Reading " + field.name + " @'+p.offset);");
		}
		
		makeFieldExpansions(bodies, 'src.' + field.name, read_dst, field);
		return read_dst;
	}
	
	var fields = this.fields;
	function get_field_config(field_name) {
		for (var i = 0, l = fields.length; i < l; i++) {
			var field = fields[i];
			if (field === field_name || field.name === field_name) {
				return field;
			}
		}
		return null;
	}
	
	var ctor_syms = [];
	if (this.ctor_args) {
		ctor_syms = map(this.ctor_args, function (ctor_arg_name) {
			var field_config = get_field_config(ctor_arg_name);
			if (field_config === null) {
				field_config = {name:ctor_arg_name, type:'generic'};
			}
			return output_expansions(bodies, field_config, true);
		});
	}
	bodies.read.push(
		"if (dst == null || dst.constructor !== this.ctor) {",
		"	dst = new this.ctor(" + ctor_syms.join(',') + ");",
		"}");
	bodies.copy.push(
		"if (dst == null || dst.constructor !== this.ctor) {",
//		"	global.bserializer_debug && console.trace('Copy making new ' + (this.ctor.name || this.index) + ' was ' + dst);",
		"	dst = new this.ctor(" + ctor_syms.join(',') + ");",
		"}");
	if (this.ctor_args) {
		bodies.read.push("else {");
		bodies.copy.push("else {");
		for (var ci = 0; ci < this.ctor_args.length; ci++) {
			var ctor_arg_name = this.ctor_args[ci];
			var ctor_sym = ctor_syms[ci];
			var field_config = get_field_config(ctor_arg_name);
			if (field_config === null) {
				throw "Couldn't find field config for ctor_args[" + ci + "]: " + ctor_arg_name;
			}
			if (field_config.serialize !== false) {
				bodies.read.push('dst.'+ctor_arg_name+'='+ctor_sym+';');
			}
			bodies.copy.push('dst.'+ctor_arg_name+'='+ctor_sym+';');
		}
		bodies.read.push("}");
		bodies.copy.push("}");
	}
	
	if (this.circular) {
		bodies.copy.push('this.setCopyCircular(dst, src, objectdb);');
		bodies.read.push(
//				'console.log("read new circular ref @", objectdb.length, dst);',
				"objectdb[n_reference] = dst;"
			);
	}
	
	if (typeof this.onPreCopyFields !== 'undefined') {
		bodies.copy.push('this.onPreCopyFields(dst, src, objectdb, copyOptions);');
	}
	if (typeof this.onPreWriteFields !== 'undefined') {
		bodies.write.push("this.onPreWriteFields(p, src, objectdb, writeOptions);");
	}
	if (typeof this.onPreReadFields !== 'undefined') {
		bodies.read.push("this.onPreReadFields(p, dst, objectdb);");
	}
	
	if (this.fields) {
		for_each(this.fields, function(field) {
			output_expansions(bodies, field);
		});
	}
	
	if (typeof this.onPostCopyFields !== 'undefined') {
		bodies.copy.push('this.onPostCopyFields(dst, src, objectdb, copyOptions);');
	}
	if (typeof this.onPostWriteFields !== 'undefined') {
		bodies.write.push("this.onPostWriteFields(p, src, objectdb, writeOptions);");
	}
	if (typeof this.onPostReadFields !== 'undefined') {
		bodies.read.push("this.onPostReadFields(p, dst, objectdb);");
	}
	
	bodies.copy.push('return dst;');
	bodies.read.push("return dst;");
	
//	console.log("Expanding copy for ", this);
	var function_suffix = this.index + this.ctor.name;
	var expansions ={
		copy: "function copy" + function_suffix + "(dst,src,objectdb) {\n\t\t" + bodies.copy.join("\n\t\t") + "}"
	};
	if (this.fields) {
		expansions.write = "function write" + function_suffix + "(p,src,objectdb,writeOptions) {\n\t\t" + bodies.write.join("\n\t\t") + "}";
		expansions.read = "function read" + function_suffix + "(p,dst,objectdb) {\n\t\t" + bodies.read.join("\n\t\t") + "}";
		expansions.copy = "function copy" + function_suffix + "(dst,src,objectdb,copyOptions) {\n\t\t" + bodies.copy.join("\n\t\t") + "}";
	}
	return expansions;
};

//if (typeof process === 'object' && process.on) {
//	process.on('SIGUSR1', function() {
//		console.log("Received siginfo");
//		global.bserializer_debug = true;
//	});
//}

ObjectConfig.prototype.makeFieldExpansions = function (bodies, write_src, read_dst) {
	bodies.write.push("bserializer.registrationsByIndex["+this.index+"].write(p, " + write_src + ", objectdb, writeOptions);");
	bodies.read.push(read_dst + " = bserializer.registrationsByIndex["+this.index+"].read(p, " + read_dst + ", objectdb);");
	bodies.copy.push(read_dst + " = bserializer.registrationsByIndex["+this.index+"].copy(" + read_dst + ", " + write_src + ", objectdb, copyOptions);");
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

function makeFieldExpansions(bodies, src, dst, field) {
//	writes.push("console.log('Writing " + src + ": ' + ("+src+" ? "+src+".length : "+src+"));");
	if (field && Array.isArray(field.type)) {
		var configs = map(field.type, getTypeConfig);
		bodies.read.push('switch (p.readUint8()) {');
		for (var i = 0, l = configs.length; i < l; i++) {
			var config = configs[i];
			
			var type_check;
			if (config.makeTypeCheck) {
				type_check = config.makeTypeCheck(src);
			}
			else {
				type_check = src + ' != null && ' + src + '.constructor === bserializer.registrationsByIndex[' + config.index + '].ctor';
			}
			
			bodies.copy.push((i > 0 ? 'else if' : 'if') + " (" + type_check + ") {");
			bodies.write.push((i > 0 ? 'else if' : 'if') + " (" + type_check + ") {");
			bodies.write.push("	p.writeUint8(" + i + ");");
			bodies.read.push('	case ' + i + ':');
			config.makeFieldExpansions(bodies, src, dst, field);
			bodies.copy.push("}");
			bodies.write.push("}");
			bodies.read.push("		break;");
		}

		bodies.copy.push("else {");
		bodies.copy.push("	throw 'Unhandled type on copy of " + field.name + ": ' + (" + src + " && " + src + ".constructor);");
		bodies.copy.push('}');
		bodies.write.push("else {");
		bodies.write.push("	throw 'Unhandled type on write of " + field.name + ": ' + (" + src + " && " + src + ".constructor);");
		bodies.write.push('}');

		bodies.read.push("	default:");
		bodies.read.push("		throw 'Unhandled type on read of " + field.name + "';");
		bodies.read.push('}');
	}
	else {
		var config = field && field.type && getTypeConfig(field.type);
		if (config && config.makeFieldExpansions) {
			config.makeFieldExpansions(bodies, src, dst, field);
		}
		else {
			bodies.write.push("bserializer.writeGeneric(p, " + src + ", objectdb, writeOptions);");
			bodies.read.push(dst + " = bserializer.readGeneric(p, " + dst + ", objectdb);");
			bodies.copy.push(dst + " = bserializer.copyGeneric(" + dst + ", " + src + ", objectdb, copyOptions);");
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

ArrayConfig.prototype.makeTypeCheck = function (variable) {
	return "Array.isArray(" + variable + ")";
};

ArrayConfig.prototype.equals = function(self, other, objectdb) {
	if (!Array.isArray(other)) {
		console.warn(equals_path.join('.') + " not an array");
		return false;
	}
	if (self.length !== other.length) {
		console.warn(equals_path.join('.') + " array length mismatch ", self.length, "!=", other.length);
		return false;
	}
	var equals = true;
	var depth = equals_path.length;
	for (var i = 0, l = self.length; i < l ; i++) {
		if (!equalsOffset(self, other, i, depth, objectdb)) {
			equals = false;
		}
	}
	equals_path.length = depth;
	return equals;
};

ArrayConfig.prototype.write = function(p, src, objectdb, writeOptions) {
	p.writeSmartUint(src.length);
	for (var i = 0, l = src.length; i < l; i++) {
		writeGeneric(p, src[i], objectdb, writeOptions);
	}
};


ArrayConfig.prototype.makeFieldExpansions = function (bodies, src_expr, dst, field) {
	
	var i = gensym('i');
	var l = gensym('l');
	var src_temp = gensym(src_expr);
	var src_el = gensym(src_expr);
	var dst_el = gensym(dst);
	var element_bodies = {
		write:[],
		read:[],
		copy:[]
	};
	
	makeFieldExpansions(element_bodies, src_el, dst_el, field.element);
	
	if (this.rle) {
		array_append(bodies.write, expand_template(
			"var @src_temp = @src_expr, @l = @src_temp.length, @src_el;",
			"p.writeSmartUint(@l);",
			"var @i = 0, @block_start = 0;",
			"if (@l > 0) while (true) {",
			"	if (@i === @block_start) {",
			"		@src_el = @src_temp[@i];",
			"	}",
			"	@i++;",
			"	if (@i === @l || @src_temp[@i] !== @src_el) {",
			GEN_VERBOSITY.rle && 
			"		console.log('Write @src_expr from ' + @block_start + '-' + @i + '/' + @l + ':' + @src_el);",
			"		p.writeSmartUint(@i - @block_start - 1);", //-1 because we can't write 0 elements
			indent("		", element_bodies.write),
			"		@block_start = @i;",
			"		if (@i === @l) break;",
			"	}",
			"}",
			{
				src_el:src_el,
				src_temp:src_temp,
				src_expr:src_expr,
				i:i,
				l:l,
				block_start:gensym('block_start')
			}
		));
			
		array_append(bodies.read, expand_template(
			"var @l = p.readSmartUint();",
			"if (@dst == null) {",
			"	@dst = [];",
			"}",
			"if (@dst.length !== @l) {",
			"	@dst.length = @l;",
			"}",
			"for (var @i = 0, @next_read = 0, @dst_el; @i < @l; @i++) {",
			"	if (@i === @next_read) {",
			"		@next_read += 1 + p.readSmartUint();",
			"		@dst_el = @dst[@i];",
			indent("		",element_bodies.read),
			GEN_VERBOSITY.rle && 
			"		console.log('Read @dst until ' + @next_read + '/' + @l + ':' + @dst_el);",
			"	}",
			"	@dst[@i] = @dst_el;",
			"}",
			{
				next_read:gensym('next_read'),
				dst_el:dst_el,
				dst:dst,
				i:i,
				l:l
			}
		));
	}
	else {
		array_append(bodies.write, expand_template(
			"var @src_temp = @src_expr, @l = @src_temp.length;",
			"p.writeSmartUint(@l);",
			"for (var @i = 0, @src_el; @i < @l; @i++) {",
			'	@src_el = @src_temp[@i];',
//			'	console.log("Writing " + @i + "/" + @l + ": " + @src_el);',
			indent('	',element_bodies.write),
			"}",
			{
				src_el:src_el,
				src_temp:src_temp,
				src_expr:src_expr,
				i:i,
				l:l
			}
		));
			
		array_append(bodies.read, expand_template(
			"var @l = p.readSmartUint();",
			"if (@dst == null || @dst.length !== @l) {",
			"	@dst = [];",
			"	@dst.length = @l;",
			"}",
			"for (var @i = 0, @dst_el; @i < @l; @i++) {",
			"	@dst_el = @dst[@i];",
			indent('	',element_bodies.read),
			"	@dst[@i] = @dst_el;",
			"}",
			{
				dst_el:dst_el,
				dst:dst,
				i:i,
				l:l
			}
		));
	}
	
	
	array_append(bodies.copy, expand_template(
		"var @src_temp = @src_expr;",
//		"var @dst_temp = @dst;",
		"var @l = @src_temp.length;",
		"if (@dst_temp == null) {",
		"	@dst_temp = [];",
		"}",
		"if (@dst_temp.length !== @l) {",
		"	@dst_temp.length = @l;",
		"}",
		"for (var @i = 0, @dst_el, @src_el; @i < @l; @i++) {",
		"	@dst_el = @dst_temp[@i];",
		"	@src_el = @src_temp[@i];",
		indent("	",element_bodies.copy),
//			"		console.log('Read @dst until ' + @next_read + '/' + @l + ':' + @el_dst);",
		"	@dst_temp[@i] = @dst_el;",
		"}",
//		"@dst = @dst_temp;",
		{
			src_el:src_el,
			dst_el:dst_el,
			dst:dst,
			dst_temp:dst,
			src_expr:src_expr,
			src_temp:src_temp,
			next_read:gensym('next_read'),
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

ArrayConfig.prototype.copy = function (dst, src, objectdb, copyOptions) {
	if (!Array.isArray(dst)) {
		dst = [];
	}
	dst.length = src.length;
	for (var i = 0 ; i < src.length; i++) {
		var src_value = src[i];
		if (typeof src_value !== 'function') {
			dst[i] = copyGeneric(dst[i], src_value, objectdb, copyOptions);
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
				config = registrationsByName['true'];
			}
			else {
				config = registrationsByName['false'];
			}
			break;
		case 'object':
			if (src === null) {
				config = registrationsByName['null'];
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

function copyGeneric(dst, src, objectdb, copyOptions) {
	var top_level = typeof objectdb === 'undefined';
	if (top_level) {
		objectdb = [];
	}
	var config = detectConfig(src);
//	if (true) console.log("copyGeneric config=",config, src);
	if (config) {
		dst = config.copy(dst, src, objectdb);
		if (copyOptions && copyOptions.test) {
			var obj_name = (dst && dst.constructor.name);
			if (!equalsGeneric(dst, src)) {
				console.error("Copy failed! " + obj_name);
			}
		}
	}
	if (top_level) {
		for (var i = 0, l = objectdb.length; i < l; i++) {
			delete objectdb[i].$bserializer_copydst;
		}
	}
	return dst;
}
bserializer.copyGeneric = copyGeneric;

function equalsGeneric(self, other, objectdb) {
	var is_top_level = typeof objectdb === 'undefined';
	if (is_top_level) {
		objectdb = [];
	}
	if (typeof self === 'object' && self !== null) {
		if (typeof self.$bserializer_equalsid === 'undefined') {
			self.$bserializer_equalsid = objectdb.length;
			objectdb.push(self);
		}
		else {
			//Will be detected false elsewhere
			return true;
		}
	}
	var config = detectConfig(self);
	var equal = config.equals(self, other, objectdb);
	if (is_top_level) {
		for_each(objectdb, function(obj) {
			delete obj.$bserializer_equalsid;
		});
	}
	return equal;
}
bserializer.equalsGeneric = equalsGeneric;

function writeGeneric(p, src, objectdb, writeOptions) {
	var top_level = typeof objectdb === 'undefined';
	if (top_level) {
		objectdb = [];
	}
	var config = detectConfig(src);
	if (config) {
		p.writeSmartUint(config.index);
//		console.log("writeGeneric @" + p.offset + ': ' + config.index + ": " + (config && (config.name || (config.ctor && config.ctor.name) || '?')) + '@' + p.offset);
		if (config.write != null) {
			config.write(p, src, objectdb, writeOptions);
		}
	}
	else if (typeof src !== 'function') {
		throw("Failed to get config of ", require('util').inspect(src));
//		console.warn("Failed to get config of ", require('util').inspect(src));
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
//	console.log("readGeneric @" + p.offset + ': ' + index + ": " + (config && (config.name || (config.ctor && config.ctor.name) || '?')));
	if (config.read != null) {
		dst = config.read(p, dst, objectdb);
	}
	return dst;
}
bserializer.readGeneric = readGeneric;

function serialize(obj, writeOptions) {
	if (PACKET_PROFILE) pp = {};
	packet.reset();
	bserializer.writeGeneric(packet, obj, undefined, writeOptions);
	if (PACKET_PROFILE) {
		var a = [];
		for (var s in pp) {
			a.push([pp[s],s]);
		}
		a.sort(function (a,b){
			return b[0] - a[0];
		});
	}
	var delivery = packet.getDelivery();
	if (writeOptions && writeOptions.test) {
		var readpacket = createPacket(delivery);
		obj = bserializer.readGeneric(readpacket, obj);
		var obj2 = bserializer.deserialize(delivery);
		var obj_name = (obj && obj.constructor.name);
		if (!equalsGeneric(obj, obj2)) {
			console.error("Serialize/deserialize failed! " + obj_name + " wrote " + packet.offset + " bytes, read " + readpacket.offset + " bytes");
		}
		else {
			console.log("Successfully serialized " + obj_name + " in " + packet.offset + " bytes");
		}
	}
	else {
	//	console.log("serialize bytes=" + packet.offset, a);
	}
	return delivery;
}

bserializer.serialize = serialize;

function deserialize(buffer, obj) {
	var packet = createPacket(buffer);
	obj = bserializer.readGeneric(packet, obj);
//	console.log("deserialize read=" + packet.offset + "/" + (packet.impl.length || packet.impl.byteLength), obj);
	return obj;
}

bserializer.deserialize = deserialize;

function detectType(buffer) {
	var packet = createPacket(buffer);
	var index = packet.readSmartUint();
	var config = registrationsByIndex[index];
	return config;
}
bserializer.detectType = detectType;

})(typeof exports === 'undefined'? this.bserializer = {}: exports);
