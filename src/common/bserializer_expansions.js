(function(bserializer) {

bserializer.addExpansions(4, {
	write:function writeString(p, src) {
		p.writeString(src);
	},
	read:function readString(p) {
		return p.readString();
	}
	});

bserializer.addExpansions(5, {
	write:function writeFloat64(p, src) {
		p.writeFloat64(src);
	},
	read:function readFloat64(p) {
		return p.readFloat64();
	}
	});

bserializer.addExpansions(6, {
	write:function writeInt8(p, src) {
		p.writeInt8(src);
	},
	read:function readInt8(p) {
		return p.readInt8();
	}
	});

bserializer.addExpansions(7, {
	write:function writeUint8(p, src) {
		p.writeUint8(src);
	},
	read:function readUint8(p) {
		return p.readUint8();
	}
	});

bserializer.addExpansions(8, {
	write:function writeInt16(p, src) {
		p.writeInt16(src);
	},
	read:function readInt16(p) {
		return p.readInt16();
	}
	});

bserializer.addExpansions(9, {
	write:function writeUint16(p, src) {
		p.writeUint16(src);
	},
	read:function readUint16(p) {
		return p.readUint16();
	}
	});

bserializer.addExpansions(10, {
	write:function writeInt32(p, src) {
		p.writeInt32(src);
	},
	read:function readInt32(p) {
		return p.readInt32();
	}
	});

bserializer.addExpansions(11, {
	write:function writeUint32(p, src) {
		p.writeUint32(src);
	},
	read:function readUint32(p) {
		return p.readUint32();
	}
	});

bserializer.addExpansions(12, {
	write:function writeFloat32(p, src) {
		p.writeFloat32(src);
	},
	read:function readFloat32(p) {
		return p.readFloat32();
	}
	});

bserializer.addExpansions(13, {
	write:function writeSmartUint(p, src) {
		p.writeSmartUint(src);
	},
	read:function readSmartUint(p) {
		return p.readSmartUint();
	}
	});

bserializer.addExpansions(17, {
	write:function writeInt8(p,src) {
		var l = src.length;
		p.writeSmartUint(l);
		for (var i = 0; i < l ; i++) {
			p.writeInt8(src[i]);
		}
	},
	read:function readInt8(p,dst) {
		var l = p.readSmartUint();
		if (dst == null || dst.constructor !== Int8Array || dst.length !== l) {
			dst = new Int8Array(l);
		}
		for (var i = 0; i < l ; i++) {
			dst[i] = p.readInt8();
		}
		return dst;
	},
	copy:function copyInt8(dst,src,objectdb) {
		if (src == null) {
			dst = src;
		}
		else if (dst == null || dst.constructor !== Int8Array || dst.length !== src.length) {
			dst = new Int8Array(src);
		}
		else {
			dst.set(src);
		}
		return dst;
	}
	});

bserializer.addExpansions(18, {
	write:function writeUint8(p,src) {
		var l = src.length;
		p.writeSmartUint(l);
		for (var i = 0; i < l ; i++) {
			p.writeUint8(src[i]);
		}
	},
	read:function readUint8(p,dst) {
		var l = p.readSmartUint();
		if (dst == null || dst.constructor !== Uint8Array || dst.length !== l) {
			dst = new Uint8Array(l);
		}
		for (var i = 0; i < l ; i++) {
			dst[i] = p.readUint8();
		}
		return dst;
	},
	copy:function copyUint8(dst,src,objectdb) {
		if (src == null) {
			dst = src;
		}
		else if (dst == null || dst.constructor !== Uint8Array || dst.length !== src.length) {
			dst = new Uint8Array(src);
		}
		else {
			dst.set(src);
		}
		return dst;
	}
	});

bserializer.addExpansions(19, {
	write:function writeInt16(p,src) {
		var l = src.length;
		p.writeSmartUint(l);
		for (var i = 0; i < l ; i++) {
			p.writeInt16(src[i]);
		}
	},
	read:function readInt16(p,dst) {
		var l = p.readSmartUint();
		if (dst == null || dst.constructor !== Int16Array || dst.length !== l) {
			dst = new Int16Array(l);
		}
		for (var i = 0; i < l ; i++) {
			dst[i] = p.readInt16();
		}
		return dst;
	},
	copy:function copyInt16(dst,src,objectdb) {
		if (src == null) {
			dst = src;
		}
		else if (dst == null || dst.constructor !== Int16Array || dst.length !== src.length) {
			dst = new Int16Array(src);
		}
		else {
			dst.set(src);
		}
		return dst;
	}
	});

bserializer.addExpansions(20, {
	write:function writeUint16(p,src) {
		var l = src.length;
		p.writeSmartUint(l);
		for (var i = 0; i < l ; i++) {
			p.writeUint16(src[i]);
		}
	},
	read:function readUint16(p,dst) {
		var l = p.readSmartUint();
		if (dst == null || dst.constructor !== Uint16Array || dst.length !== l) {
			dst = new Uint16Array(l);
		}
		for (var i = 0; i < l ; i++) {
			dst[i] = p.readUint16();
		}
		return dst;
	},
	copy:function copyUint16(dst,src,objectdb) {
		if (src == null) {
			dst = src;
		}
		else if (dst == null || dst.constructor !== Uint16Array || dst.length !== src.length) {
			dst = new Uint16Array(src);
		}
		else {
			dst.set(src);
		}
		return dst;
	}
	});

bserializer.addExpansions(21, {
	write:function writeInt32(p,src) {
		var l = src.length;
		p.writeSmartUint(l);
		for (var i = 0; i < l ; i++) {
			p.writeInt32(src[i]);
		}
	},
	read:function readInt32(p,dst) {
		var l = p.readSmartUint();
		if (dst == null || dst.constructor !== Int32Array || dst.length !== l) {
			dst = new Int32Array(l);
		}
		for (var i = 0; i < l ; i++) {
			dst[i] = p.readInt32();
		}
		return dst;
	},
	copy:function copyInt32(dst,src,objectdb) {
		if (src == null) {
			dst = src;
		}
		else if (dst == null || dst.constructor !== Int32Array || dst.length !== src.length) {
			dst = new Int32Array(src);
		}
		else {
			dst.set(src);
		}
		return dst;
	}
	});

bserializer.addExpansions(22, {
	write:function writeUint32(p,src) {
		var l = src.length;
		p.writeSmartUint(l);
		for (var i = 0; i < l ; i++) {
			p.writeUint32(src[i]);
		}
	},
	read:function readUint32(p,dst) {
		var l = p.readSmartUint();
		if (dst == null || dst.constructor !== Uint32Array || dst.length !== l) {
			dst = new Uint32Array(l);
		}
		for (var i = 0; i < l ; i++) {
			dst[i] = p.readUint32();
		}
		return dst;
	},
	copy:function copyUint32(dst,src,objectdb) {
		if (src == null) {
			dst = src;
		}
		else if (dst == null || dst.constructor !== Uint32Array || dst.length !== src.length) {
			dst = new Uint32Array(src);
		}
		else {
			dst.set(src);
		}
		return dst;
	}
	});

bserializer.addExpansions(23, {
	write:function writeFloat32(p,src) {
		var l = src.length;
		p.writeSmartUint(l);
		for (var i = 0; i < l ; i++) {
			p.writeFloat32(src[i]);
		}
	},
	read:function readFloat32(p,dst) {
		var l = p.readSmartUint();
		if (dst == null || dst.constructor !== Float32Array || dst.length !== l) {
			dst = new Float32Array(l);
		}
		for (var i = 0; i < l ; i++) {
			dst[i] = p.readFloat32();
		}
		return dst;
	},
	copy:function copyFloat32(dst,src,objectdb) {
		if (src == null) {
			dst = src;
		}
		else if (dst == null || dst.constructor !== Float32Array || dst.length !== src.length) {
			dst = new Float32Array(src);
		}
		else {
			dst.set(src);
		}
		return dst;
	}
	});

bserializer.addExpansions(24, {
	write:function writeFloat64(p,src) {
		var l = src.length;
		p.writeSmartUint(l);
		for (var i = 0; i < l ; i++) {
			p.writeFloat64(src[i]);
		}
	},
	read:function readFloat64(p,dst) {
		var l = p.readSmartUint();
		if (dst == null || dst.constructor !== Float64Array || dst.length !== l) {
			dst = new Float64Array(l);
		}
		for (var i = 0; i < l ; i++) {
			dst[i] = p.readFloat64();
		}
		return dst;
	},
	copy:function copyFloat64(dst,src,objectdb) {
		if (src == null) {
			dst = src;
		}
		else if (dst == null || dst.constructor !== Float64Array || dst.length !== src.length) {
			dst = new Float64Array(src);
		}
		else {
			dst.set(src);
		}
		return dst;
	}
	});

bserializer.addExpansions(25, {
	copy:function copy25SyncMove(dst,src,objectdb,copyOptions) {
		if (dst == null || dst.constructor !== this.ctor) {
			dst = new this.ctor();
		}
		dst.id = src.id;
		dst.tick = src.tick;
		return dst;},
	write:function write25SyncMove(p,src,objectdb,writeOptions) {
		p.writeString(src.id);
		p.writeFloat64(src.tick);},
	read:function read25SyncMove(p,dst,objectdb) {
		if (dst == null || dst.constructor !== this.ctor) {
			dst = new this.ctor();
		}
		dst.id = p.readString();
		dst.tick = p.readFloat64();
		return dst;}
	});

bserializer.addExpansions(26, {
	copy:function copy26SyncObjectMove(dst,src,objectdb,copyOptions) {
		if (dst == null || dst.constructor !== this.ctor) {
			dst = new this.ctor();
		}
		dst.id = src.id;
		dst.tick = src.tick;
		dst.objectId = src.objectId;
		return dst;},
	write:function write26SyncObjectMove(p,src,objectdb,writeOptions) {
		p.writeString(src.id);
		p.writeFloat64(src.tick);
		p.writeString(src.objectId);},
	read:function read26SyncObjectMove(p,dst,objectdb) {
		if (dst == null || dst.constructor !== this.ctor) {
			dst = new this.ctor();
		}
		dst.id = p.readString();
		dst.tick = p.readFloat64();
		dst.objectId = p.readString();
		return dst;}
	});

bserializer.addExpansions(27, {
	copy:function copy27ObjectAddedMove(dst,src,objectdb) {
		if (dst == null || dst.constructor !== this.ctor) {
			dst = new this.ctor();
		}
		return dst;}
	});

bserializer.addExpansions(28, {
	copy:function copy28ObjectRemovedMove(dst,src,objectdb) {
		if (dst == null || dst.constructor !== this.ctor) {
			dst = new this.ctor();
		}
		return dst;}
	});

bserializer.addExpansions(29, {
	copy:function copy29ObjectChatMove(dst,src,objectdb) {
		if (dst == null || dst.constructor !== this.ctor) {
			dst = new this.ctor();
		}
		return dst;}
	});

bserializer.addExpansions(30, {
	copy:function copy30StartPacket(dst,src,objectdb) {
		if (dst == null || dst.constructor !== this.ctor) {
			dst = new this.ctor();
		}
		return dst;}
	});

bserializer.addExpansions(31, {
	copy:function copy31SetupPacket(dst,src,objectdb,copyOptions) {
		if (dst == null || dst.constructor !== this.ctor) {
			dst = new this.ctor();
		}
		dst.config = bserializer.registrationsByIndex[14].copy(dst.config, src.config, objectdb, copyOptions);
		dst.oldest = bserializer.copyGeneric(dst.oldest, src.oldest, objectdb, copyOptions);
		dst.start_time = src.start_time;
		if (src.pauseTick === null) {
		dst.pauseTick = null;
		}
		else if (typeof src.pauseTick === 'number') {
		dst.pauseTick = src.pauseTick;
		}
		else {
			throw 'Unhandled type on copy of pauseTick: ' + (src.pauseTick && src.pauseTick.constructor);
		}
		dst.moves = bserializer.registrationsByIndex[14].copy(dst.moves, src.moves, objectdb, copyOptions);
		dst.user_id = src.user_id;
		return dst;},
	write:function write31SetupPacket(p,src,objectdb,writeOptions) {
		bserializer.registrationsByIndex[14].write(p, src.config, objectdb, writeOptions);
		bserializer.writeGeneric(p, src.oldest, objectdb, writeOptions);
		p.writeFloat64(src.start_time);
		if (src.pauseTick === null) {
			p.writeUint8(0);
		}
		else if (typeof src.pauseTick === 'number') {
			p.writeUint8(1);
		p.writeFloat64(src.pauseTick);
		}
		else {
			throw 'Unhandled type on write of pauseTick: ' + (src.pauseTick && src.pauseTick.constructor);
		}
		bserializer.registrationsByIndex[14].write(p, src.moves, objectdb, writeOptions);
		p.writeString(src.user_id);},
	read:function read31SetupPacket(p,dst,objectdb) {
		if (dst == null || dst.constructor !== this.ctor) {
			dst = new this.ctor();
		}
		dst.config = bserializer.registrationsByIndex[14].read(p, dst.config, objectdb);
		dst.oldest = bserializer.readGeneric(p, dst.oldest, objectdb);
		dst.start_time = p.readFloat64();
		switch (p.readUint8()) {
			case 0:
		dst.pauseTick = null;
				break;
			case 1:
		dst.pauseTick = p.readFloat64();
				break;
			default:
				throw 'Unhandled type on read of pauseTick';
		}
		dst.moves = bserializer.registrationsByIndex[14].read(p, dst.moves, objectdb);
		dst.user_id = p.readString();
		return dst;}
	});

bserializer.addExpansions(32, {
	copy:function copy32SyncPacket(dst,src,objectdb,copyOptions) {
		if (dst == null || dst.constructor !== this.ctor) {
			dst = new this.ctor();
		}
		dst.clientTime = src.clientTime;
		if (src.serverTime === null) {
		dst.serverTime = null;
		}
		else if (typeof src.serverTime === 'number') {
		dst.serverTime = src.serverTime;
		}
		else {
			throw 'Unhandled type on copy of serverTime: ' + (src.serverTime && src.serverTime.constructor);
		}
		return dst;},
	write:function write32SyncPacket(p,src,objectdb,writeOptions) {
		p.writeFloat64(src.clientTime);
		if (src.serverTime === null) {
			p.writeUint8(0);
		}
		else if (typeof src.serverTime === 'number') {
			p.writeUint8(1);
		p.writeFloat64(src.serverTime);
		}
		else {
			throw 'Unhandled type on write of serverTime: ' + (src.serverTime && src.serverTime.constructor);
		}},
	read:function read32SyncPacket(p,dst,objectdb) {
		if (dst == null || dst.constructor !== this.ctor) {
			dst = new this.ctor();
		}
		dst.clientTime = p.readFloat64();
		switch (p.readUint8()) {
			case 0:
		dst.serverTime = null;
				break;
			case 1:
		dst.serverTime = p.readFloat64();
				break;
			default:
				throw 'Unhandled type on read of serverTime';
		}
		return dst;}
	});

bserializer.addExpansions(33, {
	copy:function copy33ChecksumPacket(dst,src,objectdb,copyOptions) {
		if (dst == null || dst.constructor !== this.ctor) {
			dst = new this.ctor();
		}
		dst.tick = src.tick;
		dst.checksum = src.checksum;
		return dst;},
	write:function write33ChecksumPacket(p,src,objectdb,writeOptions) {
		p.writeUint32(src.tick);
		p.writeInt32(src.checksum);},
	read:function read33ChecksumPacket(p,dst,objectdb) {
		if (dst == null || dst.constructor !== this.ctor) {
			dst = new this.ctor();
		}
		dst.tick = p.readUint32();
		dst.checksum = p.readInt32();
		return dst;}
	});

bserializer.addExpansions(34, {
	copy:function copy34StartRequestPacket(dst,src,objectdb,copyOptions) {
		if (dst == null || dst.constructor !== this.ctor) {
			dst = new this.ctor();
		}
		dst.name = src.name;
		return dst;},
	write:function write34StartRequestPacket(p,src,objectdb,writeOptions) {
		p.writeString(src.name);},
	read:function read34StartRequestPacket(p,dst,objectdb) {
		if (dst == null || dst.constructor !== this.ctor) {
			dst = new this.ctor();
		}
		dst.name = p.readString();
		return dst;}
	});

bserializer.addExpansions(35, {
	copy:function copy35PauseRequestPacket(dst,src,objectdb,copyOptions) {
		if (dst == null || dst.constructor !== this.ctor) {
			dst = new this.ctor();
		}
		dst.pauseTick = src.pauseTick;
		return dst;},
	write:function write35PauseRequestPacket(p,src,objectdb,writeOptions) {
		p.writeFloat64(src.pauseTick);},
	read:function read35PauseRequestPacket(p,dst,objectdb) {
		if (dst == null || dst.constructor !== this.ctor) {
			dst = new this.ctor();
		}
		dst.pauseTick = p.readFloat64();
		return dst;}
	});

bserializer.addExpansions(36, {
	copy:function copy36UnpauseRequestPacket(dst,src,objectdb,copyOptions) {
		if (dst == null || dst.constructor !== this.ctor) {
			dst = new this.ctor();
		}
		dst.unpauseTime = src.unpauseTime;
		return dst;},
	write:function write36UnpauseRequestPacket(p,src,objectdb,writeOptions) {
		p.writeFloat64(src.unpauseTime);},
	read:function read36UnpauseRequestPacket(p,dst,objectdb) {
		if (dst == null || dst.constructor !== this.ctor) {
			dst = new this.ctor();
		}
		dst.unpauseTime = p.readFloat64();
		return dst;}
	});

bserializer.addExpansions(37, {
	copy:function copy37Player(dst,src,objectdb,copyOptions) {
		if (dst == null || dst.constructor !== this.ctor) {
			dst = new this.ctor();
		}
		dst.id = src.id;
		dst.index = src.index;
		dst.teamIndex = src.teamIndex;
		dst.name = src.name;
		dst.x8 = src.x8;
		dst.y8 = src.y8;
		dst.vx8 = src.vx8;
		dst.vy8 = src.vy8;
		return dst;},
	write:function write37Player(p,src,objectdb,writeOptions) {
		p.writeString(src.id);
		p.writeUint32(src.index);
		p.writeInt8(src.teamIndex);
		p.writeString(src.name);
		p.writeUint32(src.x8);
		p.writeUint32(src.y8);
		p.writeInt16(src.vx8);
		p.writeInt16(src.vy8);},
	read:function read37Player(p,dst,objectdb) {
		if (dst == null || dst.constructor !== this.ctor) {
			dst = new this.ctor();
		}
		dst.id = p.readString();
		dst.index = p.readUint32();
		dst.teamIndex = p.readInt8();
		dst.name = p.readString();
		dst.x8 = p.readUint32();
		dst.y8 = p.readUint32();
		dst.vx8 = p.readInt16();
		dst.vy8 = p.readInt16();
		return dst;}
	});

bserializer.addExpansions(38, {
	copy:function copy38SetDestination(dst,src,objectdb,copyOptions) {
		if (dst == null || dst.constructor !== this.ctor) {
			dst = new this.ctor();
		}
		dst.id = src.id;
		dst.tick = src.tick;
		dst.objectId = src.objectId;
		dst.tx = src.tx;
		dst.ty = src.ty;
		return dst;},
	write:function write38SetDestination(p,src,objectdb,writeOptions) {
		p.writeString(src.id);
		p.writeFloat64(src.tick);
		p.writeString(src.objectId);
		p.writeUint16(src.tx);
		p.writeUint16(src.ty);},
	read:function read38SetDestination(p,dst,objectdb) {
		if (dst == null || dst.constructor !== this.ctor) {
			dst = new this.ctor();
		}
		dst.id = p.readString();
		dst.tick = p.readFloat64();
		dst.objectId = p.readString();
		dst.tx = p.readUint16();
		dst.ty = p.readUint16();
		return dst;}
	});

bserializer.addExpansions(39, {
	copy:function copy39Cell(dst,src,objectdb,copyOptions) {
		if (dst == null || dst.constructor !== this.ctor) {
			dst = new this.ctor();
		}
		dst.strength0 = src.strength0;
		dst.strength1 = src.strength1;
		dst.strength2 = src.strength2;
		return dst;},
	write:function write39Cell(p,src,objectdb,writeOptions) {
		p.writeUint8(src.strength0);
		p.writeUint8(src.strength1);
		p.writeUint8(src.strength2);},
	read:function read39Cell(p,dst,objectdb) {
		if (dst == null || dst.constructor !== this.ctor) {
			dst = new this.ctor();
		}
		dst.strength0 = p.readUint8();
		dst.strength1 = p.readUint8();
		dst.strength2 = p.readUint8();
		return dst;}
	});

bserializer.addExpansions(40, {
	copy:function copy40MyGame(dst,src,objectdb,copyOptions) {
		if (dst == null || dst.constructor !== this.ctor) {
			dst = new this.ctor();
		}
		var src_teamSizes_2 = src.teamSizes;
		var l_1 = src_teamSizes_2.length;
		if (dst.teamSizes == null) {
			dst.teamSizes = [];
		}
		if (dst.teamSizes.length !== l_1) {
			dst.teamSizes.length = l_1;
		}
		for (var i_0 = 0, dst_teamSizes_4, src_teamSizes_3; i_0 < l_1; i_0++) {
			dst_teamSizes_4 = dst.teamSizes[i_0];
			src_teamSizes_3 = src_teamSizes_2[i_0];
			dst_teamSizes_4 = src_teamSizes_3;
			dst.teamSizes[i_0] = dst_teamSizes_4;
		}
		var src_teamScores_8 = src.teamScores;
		var l_7 = src_teamScores_8.length;
		if (dst.teamScores == null) {
			dst.teamScores = [];
		}
		if (dst.teamScores.length !== l_7) {
			dst.teamScores.length = l_7;
		}
		for (var i_6 = 0, dst_teamScores_a, src_teamScores_9; i_6 < l_7; i_6++) {
			dst_teamScores_a = dst.teamScores[i_6];
			src_teamScores_9 = src_teamScores_8[i_6];
			dst_teamScores_a = src_teamScores_9;
			dst.teamScores[i_6] = dst_teamScores_a;
		}
		dst.cells = bserializer.copyGeneric(dst.cells, src.cells, objectdb, copyOptions);
		dst.uidCounter = src.uidCounter;
		dst.tick = src.tick;
		dst.objects = bserializer.registrationsByIndex[14].copy(dst.objects, src.objects, objectdb, copyOptions);
		var src_messages_e = src.messages;
		var l_d = src_messages_e.length;
		if (dst.messages == null) {
			dst.messages = [];
		}
		if (dst.messages.length !== l_d) {
			dst.messages.length = l_d;
		}
		for (var i_c = 0, dst_messages_g, src_messages_f; i_c < l_d; i_c++) {
			dst_messages_g = dst.messages[i_c];
			src_messages_f = src_messages_e[i_c];
			dst_messages_g = bserializer.copyGeneric(dst_messages_g, src_messages_f, objectdb, copyOptions);
			dst.messages[i_c] = dst_messages_g;
		}
		return dst;},
	write:function write40MyGame(p,src,objectdb,writeOptions) {
		var src_teamSizes_2 = src.teamSizes, l_1 = src_teamSizes_2.length;
		p.writeSmartUint(l_1);
		for (var i_0 = 0, src_teamSizes_3; i_0 < l_1; i_0++) {
			src_teamSizes_3 = src_teamSizes_2[i_0];
			p.writeUint8(src_teamSizes_3);
		}
		var src_teamScores_8 = src.teamScores, l_7 = src_teamScores_8.length;
		p.writeSmartUint(l_7);
		for (var i_6 = 0, src_teamScores_9; i_6 < l_7; i_6++) {
			src_teamScores_9 = src_teamScores_8[i_6];
			p.writeFloat64(src_teamScores_9);
		}
		bserializer.writeGeneric(p, src.cells, objectdb, writeOptions);
		p.writeFloat64(src.uidCounter);
		p.writeFloat64(src.tick);
		bserializer.registrationsByIndex[14].write(p, src.objects, objectdb, writeOptions);
		var src_messages_e = src.messages, l_d = src_messages_e.length;
		p.writeSmartUint(l_d);
		for (var i_c = 0, src_messages_f; i_c < l_d; i_c++) {
			src_messages_f = src_messages_e[i_c];
			bserializer.writeGeneric(p, src_messages_f, objectdb, writeOptions);
		}},
	read:function read40MyGame(p,dst,objectdb) {
		if (dst == null || dst.constructor !== this.ctor) {
			dst = new this.ctor();
		}
		var l_1 = p.readSmartUint();
		if (dst.teamSizes == null || dst.teamSizes.length !== l_1) {
			dst.teamSizes = [];
			dst.teamSizes.length = l_1;
		}
		for (var i_0 = 0, dst_teamSizes_4; i_0 < l_1; i_0++) {
			dst_teamSizes_4 = dst.teamSizes[i_0];
			dst_teamSizes_4 = p.readUint8();
			dst.teamSizes[i_0] = dst_teamSizes_4;
		}
		var l_7 = p.readSmartUint();
		if (dst.teamScores == null || dst.teamScores.length !== l_7) {
			dst.teamScores = [];
			dst.teamScores.length = l_7;
		}
		for (var i_6 = 0, dst_teamScores_a; i_6 < l_7; i_6++) {
			dst_teamScores_a = dst.teamScores[i_6];
			dst_teamScores_a = p.readFloat64();
			dst.teamScores[i_6] = dst_teamScores_a;
		}
		dst.cells = bserializer.readGeneric(p, dst.cells, objectdb);
		dst.uidCounter = p.readFloat64();
		dst.tick = p.readFloat64();
		dst.objects = bserializer.registrationsByIndex[14].read(p, dst.objects, objectdb);
		var l_d = p.readSmartUint();
		if (dst.messages == null || dst.messages.length !== l_d) {
			dst.messages = [];
			dst.messages.length = l_d;
		}
		for (var i_c = 0, dst_messages_g; i_c < l_d; i_c++) {
			dst_messages_g = dst.messages[i_c];
			dst_messages_g = bserializer.readGeneric(p, dst_messages_g, objectdb);
			dst.messages[i_c] = dst_messages_g;
		}
		return dst;}
	});

})(typeof bserializer === 'undefined' ? require('bserializer') : bserializer);