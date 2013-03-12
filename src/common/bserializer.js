(function(bserializer) {

function Packet(arrayBuffer) {
	this.impl = new DataView(arrayBuffer);
	this.offset = 0;
}

Packet.prototype.getDelivery = function() {
	return this.impl.buffer.slice(0, this.offset);
};

var PACKET_DEBUG = false;

Packet.prototype.readBoolean = function() { return this.readUint8() != 0; };
Packet.prototype.writeBoolean = function(value) { this.writeUint8(value ? 1 : 0); };

Packet.prototype.readInt8   = function() { var value = this.impl.getInt8   (this.offset); this.offset++;    PACKET_DEBUG && console.log("Read ",value); return value; };
Packet.prototype.readUint8  = function() { var value = this.impl.getUint8  (this.offset); this.offset++;    PACKET_DEBUG && console.log("Read ",value); return value; };
Packet.prototype.readInt16  = function() { var value = this.impl.getInt16  (this.offset); this.offset += 2; PACKET_DEBUG && console.log("Read ",value); return value; };
Packet.prototype.readUint16 = function() { var value = this.impl.getUint16 (this.offset); this.offset += 2; PACKET_DEBUG && console.log("Read ",value); return value; };
Packet.prototype.readInt32  = function() { var value = this.impl.getInt32  (this.offset); this.offset += 4; PACKET_DEBUG && console.log("Read ",value); return value; };
Packet.prototype.readUint32 = function() { var value = this.impl.getUint32 (this.offset); this.offset += 4; PACKET_DEBUG && console.log("Read ",value); return value; };
Packet.prototype.readFloat32= function() { var value = this.impl.getFloat32(this.offset); this.offset += 4; PACKET_DEBUG && console.log("Read ",value); return value; };
Packet.prototype.readFloat64= function() { var value = this.impl.getFloat64(this.offset); this.offset += 8; PACKET_DEBUG && console.log("Read ",value); return value; };

Packet.prototype.writeInt8   = function(value) { PACKET_DEBUG && console.log("Write", value); this.impl.setInt8   (this.offset++, value); };
Packet.prototype.writeUint8  = function(value) { PACKET_DEBUG && console.log("Write", value); this.impl.setUint8  (this.offset++, value); };
Packet.prototype.writeInt16  = function(value) { PACKET_DEBUG && console.log("Write", value); this.impl.setInt16  (this.offset, value); this.offset += 2; };
Packet.prototype.writeUint16 = function(value) { PACKET_DEBUG && console.log("Write", value); this.impl.setUint16 (this.offset, value); this.offset += 2; };
Packet.prototype.writeInt32  = function(value) { PACKET_DEBUG && console.log("Write", value); this.impl.setInt32  (this.offset, value); this.offset += 4; };
Packet.prototype.writeUint32 = function(value) { PACKET_DEBUG && console.log("Write", value); this.impl.setUint32 (this.offset, value); this.offset += 4; };
Packet.prototype.writeFloat32= function(value) { PACKET_DEBUG && console.log("Write", value); this.impl.setFloat32(this.offset, value); this.offset += 4; };
Packet.prototype.writeFloat64= function(value) { PACKET_DEBUG && console.log("Write", value); this.impl.setFloat64(this.offset, value); this.offset += 8; };

Packet.prototype.readString = function() {
	var length = this.readUint32();
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
	this.writeUint32(length);
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
	
	BufferPacket.prototype.writeInt8   = function(value) { PACKET_DEBUG && console.log("Write", value); this.impl.writeInt8     (value, this.offset++, true); };
	BufferPacket.prototype.writeUint8  = function(value) { PACKET_DEBUG && console.log("Write", value); this.impl.writeUInt8    (value, this.offset++, true); };
	BufferPacket.prototype.writeInt16  = function(value) { PACKET_DEBUG && console.log("Write", value); this.impl.writeInt16BE  (value, this.offset  , true); this.offset += 2; };
	BufferPacket.prototype.writeUint16 = function(value) { PACKET_DEBUG && console.log("Write", value); this.impl.writeUInt16BE (value, this.offset  , true); this.offset += 2; };
	BufferPacket.prototype.writeInt32  = function(value) { PACKET_DEBUG && console.log("Write", value); this.impl.writeInt32BE  (value, this.offset  , true); this.offset += 4; };
	BufferPacket.prototype.writeUint32 = function(value) { PACKET_DEBUG && console.log("Write", value); this.impl.writeUInt32BE (value, this.offset  , true); this.offset += 4; };
	BufferPacket.prototype.writeFloat32= function(value) { PACKET_DEBUG && console.log("Write", value); this.impl.writeFloatBE  (value, this.offset  , true); this.offset += 4; };
	BufferPacket.prototype.writeFloat64= function(value) { PACKET_DEBUG && console.log("Write", value); this.impl.writeDoubleBE (value, this.offset  , true); this.offset += 8; };
	
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

function BaseConfig(name) {
	this.name = name;
	this.index = -1;
}

function LiteralConfig(name, value) {
	BaseConfig.call(this, name);
	this.value = value;
}
LiteralConfig.prototype = new BaseConfig();
LiteralConfig.prototype.constructor = LiteralConfig;
LiteralConfig.prototype.read = function () {
	return this.value;
};
LiteralConfig.prototype.write = function () {
};
LiteralConfig.prototype.copy = function () {
	return this.value;
};

function PrimitiveConfig(name, config) {
	BaseConfig.call(this, name);
	for (var field in config) {
		this[field] = config[field];
	}
}
PrimitiveConfig.prototype = new BaseConfig();
PrimitiveConfig.prototype.constructor = PrimitiveConfig;

PrimitiveConfig.prototype.copy = function(src) {
	return src;
};

PrimitiveConfig.prototype.makeExpansions = function() {
	var templates = {
		write: [
			"function write#TYPE#(p, src) {",
			"	p.write#TYPE#(src);",
			"}"],
		read: [
			"function read#TYPE#(p) {",
			"	return p.read#TYPE#();",
			"}"]
	};
	
	var expansions = {};
	for (var fname in templates) {
		expansions[fname] = templates[fname].join("\n\t").replace(/#TYPE#/g, this.name.charAt(0).toUpperCase() + this.name.slice(1));
	}
	return expansions;
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

ObjectConfig.prototype.write = function(p, src, objectdb) {
	if (this.circular) {
		var b_already_written = typeof src.$bserializer_writeIndex !== 'undefined';
		p.writeBoolean(b_already_written);
		if (b_already_written) {
//			console.log("write circular ref @", src.$bserializer_writeIndex, this.name || this.ctor.name || this.index);
			p.writeUint16(src.$bserializer_writeIndex);
			return;
		}
		else {
			src.$bserializer_writeIndex = objectdb.length;
//			console.log("write new circular @", src.$bserializer_writeIndex, this.name || this.ctor.name || this.index);
			objectdb.push(src);
		}
	}
	this.writeFields(p, src, objectdb);
};
var indent = [];
ObjectConfig.prototype.writeCtorArgs = function (p, src, objectdb) {
	if (this.ctor_args) {
		for (var idx = 0; idx < this.ctor_args.length ; idx ++ ) {
			var f = this.ctor_args[idx];
//			var start = p.offset;
//			console.log(indent.join(' ') + 'writing '+f+' @'+start);
//			indent.push('');
			writeGeneric(p, src[f], objectdb);
//			indent.pop();
//			console.log(indent.join(' ') + 'wrote '+f+' @'+p.offset+' in '+(p.offset-start));
		}
	}
};
ObjectConfig.prototype.writeFields = function (p, src, objectdb) {
	this.writeCtorArgs(p, src, objectdb);
	if (this.fields != null) {
		for (var i = 0, l = this.fields.length; i < l; i++) {
			var field = this.fields[i];
			if (!(this.ctor_args && this.ctor_args.indexOf(field.name) !== -1)) {
				var f = field.name;
//				var start = p.offset;
//				console.log(indent.join(' ') + 'writing '+f+' @'+start);
//				indent.push('');
				writeGeneric(p, src[f], objectdb);
//				indent.pop();
//				console.log(indent.join(' ') + 'wrote '+f+' @'+p.offset+' in '+(p.offset-start));
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
		p.writeUint16(n);
		for (var f in src) {
			if (f !== '$bserializer_writeIndex' && typeof src[f] !== 'function' && !(this.not && (f in this.not)) && !(this.ctor_args && this.ctor_args.indexOf(f) !== -1)) {
				p.writeString(f);
//				var start = p.offset;
//				isNaN(f) && console.log(indent.join(' ') + 'writing '+f+' @'+start);
//				indent.push('');
				writeGeneric(p, src[f], objectdb);
//				indent.pop();
//				isNaN(f) && console.log(indent.join(' ') + 'wrote '+f+' @'+p.offset+' in '+(p.offset-start));
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
			var reference = p.readUint16();
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
		var n = p.readUint16();
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
	var copy_body = [];
//	copy_body.push("console.trace();");
	
	if (this.circular) {
		copy_body.push('var dst_orig = this.getCopyCircular(dst, src, objectdb);');
		copy_body.push("if (typeof dst_orig !== 'undefined') return dst_orig;");
	}

	function for_each(a, f) {
		for (var i = 0, l = a.length; i < l; i++) {
			f(a[i]);
		}
	}
	function output_copy_direct(field) {
		copy_body.push('dst.' + field.name + ' = src.' + field.name + ';');
	}
	function output_copy_generic(field) {
		copy_body.push('dst.' + field.name + ' = bserializer.copyGeneric(dst.' + field.name + ', src.' + field.name + ', objectdb);');
	}
	function output_copy_by_type(field) {
		if (field.type.$bserializerclassid in registrationsByIndex) {
			output_copy_generic(field);
		}
		else {
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
				case 'array':
				case 'generic':
					output_copy_generic(field);
					break;
				default:
					throw "Unknown field type " + field.type;
			}
		}
	}

	copy_body.push('if (dst == null) {');
	var ctor_params = [];
	if (this.ctor_args) {
		for (var ci = 0 ; ci < this.ctor_args.length; ci++) {
			ctor_params.push('src.' + this.ctor_args[ci]);
		}
	}

	copy_body.push('	dst=new this.ctor(' + ctor_params.join(',') + ');');
	var any_static = false;
	if (this.fields) {
		for_each(this.fields, function(field) {
			if (field.static) {
				output_copy_by_type(field);
				any_static = true;
			}
		});
	}
	copy_body.push('}');
	if (any_static) {
		copy_body.push('else {');
		for_each(this.fields, function(field) {
			if (field.static) {
				output_copy_direct(field);
			}
		});
		copy_body.push('}');
	}
	if (this.circular) {
		copy_body.push('this.setCopyCircular(dst, src, objectdb);');
	}
	if (this.fields) {
		for_each(this.fields, function(field) {
			if (!field.static) {
				output_copy_by_type(field);
			}
		});
	}
	else {
		copy_body.push('this.copyFields(dst, src, objectdb);');
	}
	copy_body.push('return dst;');
//	console.log("Expanding copy for ", this);
	return {
		copy: "function copy" + this.index + this.ctor.name + "(dst,src,objectdb) {\n\t\t" + copy_body.join("\n\t\t") + "}"
	};
};


function ArrayConfig(name) {
	BaseConfig.call(this, name);
}
ArrayConfig.prototype = new BaseConfig();
ArrayConfig.prototype.constructor = ArrayConfig;

ArrayConfig.prototype.write = function(p, src, objectdb) {
	p.writeUint32(src.length);
	for (var i = 0, l = src.length; i < l; i++) {
		writeGeneric(p, src[i], objectdb);
	}
};

ArrayConfig.prototype.read = function(p, dst, objectdb) {
	var l = p.readUint32();
	if (dst == null || dst.length !== l) {
		dst = [];
		dst.length = l;
	}
	for (var i = 0; i < l ; i++) {
		dst[i] = readGeneric(p, dst[i], objectdb);
	}
	return dst;
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
	var templates = {
		write: [
			"function write" + this.index + "(p,src) {",
			"	var l = src.length;",
			"	p.writeUint32(l);",
			"	for (var i = 0; i < l ; i++) {",
			"		p.write#TYPE#(src[i]);",
			"	}",
			"}"],
		read: [
			"function read" + this.index + "(p,dst) {",
			"	var l = p.readUint32();",
			"	if (dst == null || dst.constructor !== #TYPE#Array || dst.length !== l) {",
			"		dst = new #TYPE#Array(l);",
			"	}",
			"	for (var i = 0; i < l ; i++) {",
			"		dst[i] = p.read#TYPE#();",
			"	}",
			"	return dst;",
			"}"],
		copy: [
			"function copy" + this.index + "(dst,src,objectdb) {",
			"	if (src == null) {",
			"		dst = src;",
			"	}",
			"	else if (dst == null || dst.constructor !== #TYPE#Array || dst.length !== src.length) {",
			"		dst = new #TYPE#Array(src);",
			"	}",
			"	else {",
			"		dst.set(src);",
			"	}",
			"	return dst;",
			"}"]};
	
	var expansions = {};
	for (var fname in templates) {
		expansions[fname] = templates[fname].join("\n\t").replace(/#TYPE#/g, this.prefix);
	}
	return expansions;
};


registerClass(new LiteralConfig('undefined'));
registerClass(new LiteralConfig('null', null));
registerClass(new LiteralConfig('false', false));
registerClass(new LiteralConfig('true', true));

registerClass(new PrimitiveConfig('string'));
registerClass(new PrimitiveConfig('float64'));
registerClass(new PrimitiveConfig('int8'));
registerClass(new PrimitiveConfig('uint8'));
registerClass(new PrimitiveConfig('int16'));
registerClass(new PrimitiveConfig('uint16'));
registerClass(new PrimitiveConfig('int32'));
registerClass(new PrimitiveConfig('uint32'));
registerClass(new PrimitiveConfig('float32'));

registerClass(new ObjectConfig({name:'object', noAnnotate:true, noExpand:true}));
registerClass(new ArrayConfig('array'));

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
				s.push(func+':'+expansions[func]);
			}
			fs.writeSync(out, 'bserializer.addExpansions(' + idx + ', {\n\t' + s.join(",\n\t") + "});\n\n");
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
	if (k.$bserializerid != null) {
		console.trace('Object already set ' + k.$bserializerid);
		this.objects[k.$bserializerid].v = v;
	}
	else {
		k.$bserializerid = this.num_objects++;
		if (this.num_objects > this.objects.length) {
			this.objects.push({k:k,v:v});
		}
		else {
			var obj = this.objects[k.$bserializerid];
			obj.k = k;
			obj.v = v;
		}
//		console.trace('Setting object ' + k.$bserializerid);
	}
	return k.$bserializerid;
};
ObjectMapper.prototype.get = function(k) {
	var id = k.$bserializerid;
	return id && this.objects[id].v;
};
ObjectMapper.prototype.getIndex = function(k) {
	return k.$bserializerid;
};
ObjectMapper.prototype.discard = function() {
	for (var i=0;i<this.num_objects;i++) {
		var obj = this.objects[i];
		delete obj.k.$bserializerid;
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
		delete obj.k.$bserializerid;
		values[i] = obj.v;
		values[i].i = i;
		obj.k = null;
		obj.v = null;
	}
	this.num_objects = 0;
	ObjectMapper.pool.push(this);
	return values;
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
		if (config.directCopy) {
			dst = src;
		}
		else {
			dst = config.copy(dst, src, objectdb);
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

function writeGeneric(p, src, objectdb) {
	var top_level = typeof objectdb === 'undefined';
	if (top_level) {
		objectdb = [];
	}
	var config = detectConfig(src);
	if (config) {
		p.writeUint16(config.index);
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
	var index = p.readUint16();
	var config = registrationsByIndex[index];
	if (config.read != null) {
		dst = config.read(p, dst, objectdb);
	}
	return dst;
}
bserializer.readGeneric = readGeneric;

function serialize(obj) {
	packet.offset = 0;
	bserializer.writeGeneric(packet, obj);
//	console.log("serialize bytes=" + packet.offset, obj);
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

function serialize_old(input, objectdb) {
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
		//Firefox doesn't allow you to set custom parameters on array buffers
//		output = {r:objectdb.set(input, entry)};
		for (var index = 0 ; index < input.length; index++) {
//			console.log("Serializing array ", type, "[", index, "]:", input[index]);
			payload[index] = serialize_old(input[index], objectdb);
		}
		output = entry;
	}
	
	if (input === undefined) {
		output = {u:0};
	}
	else if (input === null) {
		output = {x:0};
	}
	else if (typeof input === 'object' && (payload = objectdb.getIndex(input)) !== undefined) {
		output = {r:payload};
//		console.log("Outputting already-serialized ", output);
	}
	else if (input.constructor.$bserializerclassid != null) {
		var config = registrationsByIndex[input.constructor.$bserializerclassid];
		var fieldName;
		payload = {};
		var entry = {};
		entry[config.index] = payload;
		output = {r:objectdb.set(input, entry)};
		if (config.fields) {
			for (var fieldIndex = 0; fieldIndex < config.fields.length; fieldIndex++) {
				fieldName = config.fields[fieldIndex];
				if (fieldName in input) {
					if (typeof input[fieldName] !== 'function' && fieldName !== '$bserializerid') {
						payload[fieldName] = serialize_old(input[fieldName], objectdb);
					}
				}
			}
		}
		else if (config.not) {
			for (fieldName in input) {
				if (!(fieldName in config.not) && typeof input[fieldName] !== 'function' && fieldName !== '$bserializerid') {
					payload[fieldName] = serialize_old(input[fieldName], objectdb);
				}
			}
		}
		else {
			for (fieldName in input) {
				if (typeof input[fieldName] !== 'function' && fieldName !== '$bserializerid') {
					payload[fieldName] = serialize_old(input[fieldName], objectdb);
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
	else if (global.Float64Array && input instanceof global.Float64Array) {
		serializeArray('af64');
	}
	else if (Array.isArray(input)) {
		payload = [];
		payload.length = input.length;
		output = {r:objectdb.set(input, {a:payload})};
		for (var index = 0 ; index < input.length; index++) {
			payload[index] = serialize_old(input[index], objectdb);
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
			if (typeof input[fieldName] !== 'function' && fieldName !== '$bserializerid') {
				payload[fieldName] = serialize_old(input[fieldName], objectdb);
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
bserializer.serialize_old = serialize_old;

function deserialize_old(input, objectdb_in, objectdb_out) {
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
			var n_type = parseInt(type, 10);
			if (!isNaN(n_type)) {
				var config = registrationsByIndex[n_type];
				if (config.ctor_args) {
					var params = [];
					for (var argIndex = 0; argIndex < config.ctor_args.length ; argIndex++) {
						var arg_field = config.ctor_args[argIndex]
						var arg_value;
						if (arg_field in payload) {
							arg_value = deserialize_old(payload[arg_field], objectdb_in, objectdb_out);
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
							output[fieldName] = deserialize_old(payload[fieldName], objectdb_in, objectdb_out);
						}
					}
				}
				else if (config.not) {
					for (fieldName in payload) {
						if (!(fieldName in config.not)) {
							output[fieldName] = deserialize_old(payload[fieldName], objectdb_in, objectdb_out);
						}
					}
				}
				else {
					for (fieldName in payload) {
						output[fieldName] = deserialize_old(payload[fieldName], objectdb_in, objectdb_out);
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
						output[index] = deserialize_old(payload[index], objectdb_in, objectdb_out);
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
							output[index] = deserialize_old(payload[index], objectdb_in, objectdb_out);
						}
						break;
					case 'af32':
						deserializeArray(global.Float32Array || Array);
						break;
					case 'af64':
						deserializeArray(global.Float64Array || Array);
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
							output[fieldName] = deserialize_old(payload[fieldName], objectdb_in, objectdb_out);
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
bserializer.deserialize_old = deserialize_old;

})(typeof exports === 'undefined'? this.bserializer = {}: exports);
