

global.bserializer = require(PROJ_ROOT + '/src/common/bserializer.js');
global.syncem = require(PROJ_ROOT + '/src/common/syncem.js');
global.player = require(PROJ_ROOT + '/src/common/player.js');
global.mygame = require(PROJ_ROOT + '/src/common/mygame.js');

var client = require('./client.js');
var ws = require('ws');

bserializer.finishExpansions(PROJ_ROOT + '/src/common/bserializer_expansions.js');


function GameServer() {
	this.syncer = new syncem.Syncer({lps:mygame.LPS});
	this.syncer.lazyUpdater = true;
	this.activeSessions = {};
	this.activeSessionsByUserId = {};
	this.numActiveSessions = 0;
	
	var game = new mygame.MyGame();
	this.syncer.start(game);
	var gameServer = this;
	this.syncer.onUpdate = function() {
		var oldest_tick = this.getOldestTick();
//		if (gameServer.isAnyonePlaying() && (gameServer.areAllPlayersDebug() || oldest_tick % this.config.lps === 0)) {
		if (gameServer.isAnyonePlaying() && (oldest_tick % this.config.lps === 0)) {
			var checkdata = this.getState(oldest_tick).getCheckData();
			
			var checksum_obj = new syncem.ChecksumPacket(oldest_tick, checkdata);
			var checksum_buffer = bserializer.serialize(checksum_obj, {objectFieldSort:true});
			
			for (var session_id in gameServer.activeSessions) {
				var userSession = gameServer.activeSessions[session_id];
				if (userSession.socket && userSession.socket.readyState === ws.OPEN) {
					userSession.socket.send(userSession.debug ? checkdata : checksum_buffer, {binary:true});
				}
			}
		}
	};
	
	var gameServer = this;
	this.extinctionCheckInterval = setInterval(function() {
		var now = new Date().getTime();
		for (var sessionId in gameServer.activeSessions) {
			var userSession = gameServer.activeSessions[sessionId];
//			console.log("check timeout for " + userSession.getName() + " " + (userSession.timeoutAt - now) + "ms until timeout");
			if (userSession && now >= userSession.timeoutAt) {
				console.log("User " + userSession.getName() + " timed out");
				if (userSession.playing) {
					userSession.removePlayer();
				}
				if (userSession.socket && userSession.socket.readyState === ws.OPEN) {
					userSession.socket.close();
				}
				if (userSession.user) {
					delete gameServer.activeSessionsByUserId[userSession.user.id];
				}
				delete gameServer.activeSessions[sessionId];
				gameServer.numActiveSessions--;
			}
		}
	}, 10000);
}
exports.GameServer = GameServer;

GameServer.prototype.addSession = function(userSession) {
	if (!(userSession.sessionId in this.activeSessions)) {
		this.numActiveSessions++;
	}
	this.activeSessions[userSession.sessionId] = userSession;
};

GameServer.prototype.removeSession = function (session) {
	if (session.sessionId in this.activeSessions) {
		this.numActiveSessions--;
		delete this.activeSessions[session.sessionId];
	}
};
	
GameServer.prototype.getOrCreateUserSession = function(session_id) {
	var userSession;
	if (session_id in this.activeSessions) {
		userSession = this.activeSessions[session_id];
	}
	else {
		userSession = new client.UserSession(this, session_id);
		this.addSession(userSession);
	}
	return userSession;
};

GameServer.prototype.isAnyonePlaying = function () {
	if (this.activeSessions) {
		for (var sessionId in this.activeSessions) {
			if (this.activeSessions[sessionId].playing) {
				return true;
			}
		}
	}
	return false;
};

GameServer.prototype.broadcast = function(data, fromUser) {
	if (!(data instanceof Buffer)) {
		data = bserializer.serialize(data);
	}
	for (var otherSessionId in this.activeSessions) {
		if (typeof fromUser === 'undefined' || otherSessionId !== fromUser) {
			var otherUserSession = this.activeSessions[otherSessionId];
			if (otherUserSession && otherUserSession.playing && otherUserSession.isConnected()) {
				otherUserSession.socket.send(data, {binary:true});
			}
		}
	}
};

	
GameServer.prototype.clientSocketOpened = function (session_id, socket, connection) {
	var userSession = this.getOrCreateUserSession(session_id);
	userSession.debug = connection.remoteAddress === '127.0.0.1';
	userSession.setSocket(socket);
};
