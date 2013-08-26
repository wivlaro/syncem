var fs = require('fs');
var ws = require('ws');

var SESSION_TIMEOUT_LOAD = 60000;
var SESSION_TIMEOUT = 30000;

function UserSession(gameServer, sessionId) {
	this.gameServer = gameServer;
	this.sessionId = sessionId;
	this.nickname = 'A Chump';
	this.socket = null;
	this.playing = false;
	this.debug = false;
	this.timeoutAt = new Date().getTime() + SESSION_TIMEOUT_LOAD;
}
exports.UserSession = UserSession;

UserSession.prototype.isConnected = function() {
	return this.socket && this.socket.readyState === ws.OPEN;
};

UserSession.prototype.getName = function() {
	return this.nickname || this.sessionId;
};

UserSession.prototype.send = function(data) {
	if (!(data instanceof Buffer)) {
		data = bserializer.serialize(data);
	}
	if (this.isConnected()) {
		this.socket.send(data, {binary:true});
	}
};

UserSession.prototype.addPlayer = function(gameServer) {
	this.gameServer = gameServer;
	var plyr = new player.Player(this.sessionId, this.getName());
	var state = gameServer.syncer.getState();
	plyr.teamIndex = state.weakestTeam;

	var addMove = new syncem.ObjectAddedMove(plyr);
	addMove.tick = this.gameServer.syncer.getNowTick() + 1;
	this.gameServer.syncer.addMove(addMove);
	this.gameServer.broadcast(bserializer.serialize(addMove), this.sessionId);
	this.playing = true;
};

UserSession.prototype.removePlayer = function() {
	this.playing = false;
	console.log("Disconnected "+ this.sessionId + " " + this.getName() + ": ", arguments);
	var move = new syncem.ObjectRemovedMove(this.sessionId);
	move.tick = this.gameServer.syncer.getNowTick() + 1;
	this.gameServer.syncer.addMove(move);
	this.gameServer.broadcast(bserializer.serialize(move), this.sessionId);
};

UserSession.prototype.sendSetup = function() {
	var setup_packet = new syncem.SetupPacket(this.gameServer.syncer, this.sessionId);
	var setup_data = bserializer.serialize(setup_packet, {test:true});
	this.send(setup_data);
};


UserSession.prototype.setSocket = function (socket) {
	if (this.socket && this.socket.readyState === ws.OPEN) {
		this.socket.close(4004, 'Socket reopened elsewhere');
	}
	this.socket = socket;
	
	//Maybe send some welcome packet?
	//this.send(...)
	
	var userSession = this;
	socket.on('message', function(data, flags) {
		var packet = bserializer.deserialize(data);
		if (packet instanceof syncem.SyncPacket) {
			var now = new Date().getTime();
			packet.serverTime = now;
			userSession.send(bserializer.serialize(packet));
			userSession.timeoutAt = now + SESSION_TIMEOUT;
//			console.log("Recv from " + userSession.getName() + ' ' + packet.constructor.name + ': ' + packet.clientTime + " from " + (now - packet.clientTime) +"ms ago");
		}
		else if (packet instanceof syncem.SyncMove) {
			var valid = packet.objectId === userSession.sessionId;
			if (valid) {
				if (userSession.gameServer.syncer.addMove(packet)) {
					userSession.gameServer.broadcast(data, userSession.sessionId);
				}
				else {
					var laggedOutMove = new syncem.ObjectChatMove('system', 'lagged out');
					laggedOutMove.tick = userSession.gameServer.syncer.tick + 1;
					userSession.gameServer.broadcast(laggedOutMove);
					userSession.gameServer.syncer.addMove(laggedOutMove);
					
					//Reset controls here probably
					
					//User is too old, would go out of sync, just re-send them the setup
					userSession.sendSetup();
				}
			}
			else {
				userSession.socket.close(4002, 'Invalid user id ' + packet.objectId);
			}
			console.log("Recv from " + userSession.getName() + ' ' + packet.constructor.name + ': ' + packet.id);
		}
		else if (packet instanceof syncem.StartRequestPacket) {
			userSession.nickname = packet.name;
			if (!userSession.playing) {
				userSession.addPlayer(userSession.gameServer);
			}
			userSession.sendSetup();
			console.log("Recv from " + userSession.getName() + ' ' + packet.constructor.name);
		}
		else if (packet instanceof syncem.PauseRequestPacket) {
			if (userSession.debug) {
				userSession.gameServer.syncer.pauseAt(packet.pauseTick);
				userSession.gameServer.syncer.pauseAt(packet.pauseTick);
			}
			console.log("Recv " + packet.constructor.name + ': pauseTick='+packet.pauseTick);
		}
		else if (packet instanceof syncem.UnpauseRequestPacket) {
			if (userSession.gameServer.syncer) {
				userSession.gameServer.syncer.unpauseAt(packet.unpauseTime);
			}
			console.log("Recv " + packet.constructor.name + ': unpauseTime='+packet.unpauseTime);
		}
		else {
			console.log("Recv from " + userSession.getName() + ' ' + packet.constructor.name + ': Unknown!',packet || data);
		}
	});
	
	socket.on('error', function() {
		console.error("Client error ", arguments);
	});
	
	socket.on('close', function () {
		if (userSession.socket === socket) {
			userSession.socket = null;
		}
	});
};

