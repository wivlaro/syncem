window.global = window;
function onLoad() {
	
var e_connStatus = document.getElementById('connection-status');
var canvas = document.getElementById("canvas");

window.debug = {
	network:false
};

var animationFrameRequest = null;
var requestAnimationFrame = window.requestAnimationFrame ||
		window.webkitRequestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		window.oRequestAnimationFrame ||
		window.msRequestAnimationFrame ||
		function(callback) {
			setTimeout(callback, 1000 / 60);
		};

var ws;
var player_id;
var playing = false;
var local = window.location.hostname === 'localhost';
var syncer;
var num_incoming_checksums = 0;
var incoming_checksums = {};

var e_chatInput = document.getElementById('chat-input');
window.sendChat = function() {
	sendMove(new syncem.ObjectChatMove(player_id, e_chatInput.value));
	e_chatInput.value = '';
};

function autoPause() {
	//TODO: Reinstate
//	if (!syncer.isPaused()) {
//		var pausePacket = new syncem.PauseRequestPacket(syncer.pause());
//		wsSend(pausePacket);
//	}
}


function wsSend(data) {
	if (!(data instanceof ArrayBuffer)) {
		data = bserializer.serialize(data);
	}
	var send = ws && ws.readyState === WebSocket.OPEN;
	if (send) {
		ws.send(data);
	}
	else {
		console.warn("Failed to send " + data.byteLength + " bytes. WebSocket not open");
	}
	return send;
}

var bestSyncPackets = [];

function handleSyncPacket(packet) {
	var time_here = new Date().getTime();
	var time_rtt = time_here - packet.clientTime;
	var MAX_BEST_SYNC_PACKETS = 5;
	if (bestSyncPackets.length < MAX_BEST_SYNC_PACKETS || time_rtt < bestSyncPackets[bestSyncPackets.length-1].roundTripTime) {
		
		packet.roundTripTime = time_rtt;
		
		var target_offset = packet.serverTime + time_rtt * 0.5 - time_here;
		syncem.lerpTimeOffset(target_offset, timeLerpAmount);
		timeLerpAmount = 0.5;
		
		bestSyncPackets.push(packet);
		bestSyncPackets.sort(function (pa, pb) {
			return pa.roundTripTime - pb.roundTripTime;
		});
		if (bestSyncPackets.length > MAX_BEST_SYNC_PACKETS) {
			bestSyncPackets.splice(MAX_BEST_SYNC_PACKETS, bestSyncPackets.length - MAX_BEST_SYNC_PACKETS);
		}
	}
	window.debug.network && console.log("Round trip " + time_rtt + ", best round trips: ", bestSyncPackets.map(function(p) { return p.roundTripTime; }).join(' '));
}

var timeLerpAmount = 1;
function initSocket() {
	if (ws && ws.readyState == WebSocket.OPEN) {
		ws.close(4100, 'Reopening');
	}
	ws = new WebSocket('ws://' + location.host);
	ws.binaryType = 'arraybuffer';

	ws.onopen = function() {
		if (this !== ws) return; //Ignore if not the current websocket
		e_connStatus.textContent = 'Connected';
		window.debug.network && console.log("Sending StartRequestPacket");
		wsSend(new syncem.StartRequestPacket(prompt('Enter your name')));
		sendSyncPacket();
	};
	
	ws.onmessage = function(event) {
		if (this !== ws) return; //Ignore if not the current websocket
		var packet = bserializer.deserialize(event.data);
		if (packet instanceof syncem.SyncPacket) {
			handleSyncPacket(packet);
			window.debug.network && console.log("Recv " + packet.constructor.name + ': '+packet.clientTime+' serverTime='+packet.serverTime+' rtt='+packet.roundTripTime+'ms');
		}
		else if (packet instanceof syncem.SyncMove) {
			if (syncer) {
				if (!syncer.addMove(packet, true)) {
					syncer.stop();
					setPlaying(false);
					initSocket();
				}
			}
			window.debug.network && console.log("Recv " + packet.constructor.name + ': '+packet.id+' objectId='+packet.objectId);
		}
		else if (packet instanceof syncem.SetupPacket) {
			window.debug.network && console.log("Received setup for tick ", packet.oldest.tick);
			player_id = packet.user_id;
			if (syncer) {
				syncer.stop();
			}
			incoming_checksums = {};
			num_incoming_checksums = 0;
			syncer = packet.createSyncer();
//			syncer.start();
			syncer.onUpdate = function() {
				var oldest_tick = this.getOldestTick();
				if (oldest_tick in incoming_checksums) {
					validate_checksum(incoming_checksums[oldest_tick]);
					delete incoming_checksums[oldest_tick];
					num_incoming_checksums--;
				}
			};
			setPlaying(true);
			window.debug.network && console.log("Recv " + packet.constructor.name + ': user_id='+packet.user_id+' tick='+packet.oldest.tick);
			e_connStatus.textContent = 'Started';
		}
		else if (packet instanceof syncem.ChecksumPacket || packet instanceof mygame.MyGame) {
			if (syncer) {
				var oldest_tick = syncer.getOldestTick();
//				console.log("Checksum for " + packet.tick + ", oldest currently:" + oldest_tick);
				if (packet.tick == oldest_tick) {
					validate_checksum(packet);
				}
				else if (packet.tick < oldest_tick) {
	//				console.log("Checksum ",checksum.tick," already too old :-/ oldest possible is ",syncer.getOldestTick());
				}
				else if (num_incoming_checksums < syncer.config.lps) {
					local && validate_checksum(packet);
					incoming_checksums[packet.tick] = packet;
					num_incoming_checksums++;
				}
				else {
					console.warn("Too many incoming checksums " + num_incoming_checksums + " dropping ");
				}
			}
			window.debug.network && console.log("Recv " + packet.constructor.name + ': checksum='+packet.checksum+' tick='+packet.tick);
		}
		else if (packet instanceof syncem.PauseRequestPacket) {
			if (syncer) {
				syncer.pauseAt(packet.pauseTick);
			}
			window.debug.network && console.log("Recv " + packet.constructor.name + ': pauseTick='+packet.pauseTick);
		}
		else if (packet instanceof syncem.UnpauseRequestPacket) {
			if (syncer) {
				syncer.unpauseAt(packet.unpauseTime);
			}
			window.debug.network && console.log("Recv " + packet.constructor.name + ': unpauseTime='+packet.unpauseTime);
		}
		else {
			console.warn("Recv " + (packet && packet.constructor.name) + ': Unknown!',packet || event.data || event);
		}
	};
	
	var sync_timeout = null;
	function sendSyncPacket() {
		if (sync_timeout !== null) {
			clearTimeout(sync_timeout);
		}
		var packet = new syncem.SyncPacket();
		packet.clientTime = new Date().getTime();
		if (wsSend(packet)) {
			sync_timeout = setTimeout(sendSyncPacket, playing ? 1000 : 10000);
		}
	}
	
	ws.onerror = function(error) {
		if (this !== ws) return; //Ignore if not the current websocket
		console.error("Connection error:", arguments);
		setPlaying(false);
		e_connStatus.textContent = 'Error: ' + error;
	};
	
	ws.onclose = function(data) {
		if (this !== ws) return; //Ignore if not the current websocket
		setPlaying(false);
		e_connStatus.textContent = 'Disconnected: '+((data && data.reason) || data);
	};
}


var success_rate = 0;
var SUCCESS_MAX = 10;
//	var FAILURE_MIN = -10;
var FAILURE_MIN = -Infinity;
function validate_checksum(checksum_obj) {
	var oldest_state = syncer.getState(checksum_obj.tick);
	if (oldest_state) {
		var client_checkdata = oldest_state.getCheckData();
		var computed = syncem.simpleChecksum(client_checkdata);
		var server_checksum;
		if (checksum_obj instanceof syncem.SyncRoot) {
			var server_checkdata = checksum_obj.getCheckData();
			server_checksum = syncem.simpleChecksum(server_checkdata);
		}
		else {
			server_checksum = checksum_obj.checksum;
		}
		if (computed === server_checksum) {
			e_connStatus.textContent = "Sync OK @" + checksum_obj.tick;
			if (success_rate < SUCCESS_MAX) {
				success_rate++;
			}
		}
		else {
			if (checksum_obj instanceof syncem.SyncRoot) {
				console.warn("checksum mismatch: ",computed.toString(16), server_checksum.toString(16));
				console.warn("Client:",bserializer.copyGeneric(null, oldest_state));
				console.warn("Server:",checksum_obj);
				console.warn("Client == Server: ", bserializer.equalsGeneric(oldest_state, checksum_obj));
			}

			if (success_rate > FAILURE_MIN) {
				success_rate--;
			}
			else {
				setPlaying(false);
			}
			var msg = "OUT OF SYNC x" + success_rate + " @" + checksum_obj.tick;
			console.warn(msg);
			e_connStatus.textContent = msg;
//			local && autoPause();
		}
	}
	else {
		e_connStatus.textContent = "LAG in " + checksum_obj.tick;
	}
}

function requestRender() {
	if (animationFrameRequest === null) {
		animationFrameRequest = requestAnimationFrame(render);
	}
}

canvas.addEventListener('click', function(event) {
	var canvas_x = 0, canvas_y = 0;
	var element = canvas;
	do {
		canvas_x += element.offsetLeft;
		canvas_y += element.offsetTop;
	} while (element = element.offsetParent);

	var x = event.pageX - canvas_x;
	var y = event.pageY - canvas_y;
	
	sendMove(new player.SetDestination(player_id, x, y));
	
}, true);


var tick_prev_render = 0;
var frames_skipped = 0;
function render() {
	animationFrameRequest = null;
	if (playing) {
		requestRender();
	}
	var state = syncer.getState();
	if (state && state.tick > tick_prev_render) {
		if (frames_skipped > 2) {
			console.log("frames_skipped",frames_skipped);
		}
		frames_skipped = 0;
		renderScene(state);
		tick_prev_render = state.tick;
	}
	else {
		frames_skipped++;
	}
}


var ctx = canvas.getContext("2d");
ctx.font = '12px monospace';

function shadowText(text, x, y) {
	ctx.fillStyle = 'black';
	ctx.fillText(text, x+1, y+1);
	ctx.fillStyle = 'white';
	ctx.fillText(text, x, y);
}

function renderScene(state) {
	
	for (var y = 0, i = 0; y < mygame.NUM_CELLS_Y; y++) {
		for (var x = 0; x < mygame.NUM_CELLS_X; x++, i++) {
			var cell = state.cells[i];
			//Attempt ONE
//			ctx.fillStyle = "rgba(" + cell.strengths[0] + "," + cell.strengths[1] + "," + cell.strengths[2] + ", 1)";
//			
			//Attempt TWO
//			ctx.fillStyle = "rgba(" + cell.strength0 + "," + cell.strength1 + "," + cell.strength2 + ", 1)";

			ctx.fillStyle = "rgba(" + (cell&255) + "," + ((cell>>8)&255) + "," + ((cell>>16)&255) + ", 1)";
			ctx.fillRect(x<<4, y<<4, 16, 16);
		}
	}
	
	
	for (var objectId in state.objects) {
		var object = state.objects[objectId];
		ctx.save();
		var fill = [0,0,0];
		fill[object.teamIndex] = 64;
		ctx.fillStyle = 'rgba('+fill.join(',')+',1);';
//		console.log("Drawing at ",object.x8>>8, object.y8>>8,object.vx8,object.vy8);
		ctx.translate(object.x8>>8, object.y8>>8);
		ctx.beginPath();
		
		ctx.lineTo(-object.vy8 - object.vx8>>5,  object.vx8 - object.vy8>>5);
		ctx.lineTo( object.vx8>>5, object.vy8>>5);
		ctx.lineTo( object.vy8 - object.vx8>>5, -object.vx8 - object.vy8>>5);
		ctx.lineTo(0,0);
//		ctx.arc(0,0,10,0,Math.PI);
		ctx.fill();
		ctx.restore();
	}
	
	ctx.save();
//	ctx.globalCompositeOperation = 'xor';
	var CHAT_MARGIN = 10;
	for (var mi = state.messages.length - 1, y = canvas.height - CHAT_MARGIN, nMessages = 0; mi >= 0 && nMessages < 10; mi--, y-=12, nMessages++) {
		var message = state.messages[mi];
		var from = message.objectId;
		if (from in state.objects) {
			var fromObj = state.objects[from];
			if (fromObj.name) {
				from = fromObj.name;
			}
		}
		shadowText(from + (message.system ? ' ' : ': ') + message.message, CHAT_MARGIN, y);
	}
	ctx.restore();
	
	var perfect = mygame.NUM_CELLS_X * mygame.NUM_CELLS_Y * 255;
	var score_y = CHAT_MARGIN;
	if (state.teamScores[0]) shadowText('Red:   ' + Math.round(state.teamScores[0] * 1000 / perfect)/10 + '%', CHAT_MARGIN, score_y += CHAT_MARGIN);
	if (state.teamScores[1]) shadowText('Green: ' + Math.round(state.teamScores[1] * 1000 / perfect)/10 + '%', CHAT_MARGIN, score_y += CHAT_MARGIN);
	if (state.teamScores[2]) shadowText('Blue:  ' + Math.round(state.teamScores[2] * 1000 / perfect)/10 + '%', CHAT_MARGIN, score_y += CHAT_MARGIN);
}



function setPlaying(should_play) {
	if (playing != should_play) {
		playing = should_play;
		if (playing) {
			requestRender();
		}
		if (!playing) {
			syncer.stop();
			if (ws.readyState === WebSocket.OPEN) {
				try {
					ws.close();
				}
				catch (e) {
					console.warn("Ungracefully closed: ", e);
				}
			}
		}
	}
}

function sendMove(move) {
	if (playing) {
		move.tick = syncer.getNowTick() + 1;
		if (!syncer.addMove(move, true)) {
			throw 'Failed to add local move';
		}
		wsSend(bserializer.serialize(move));
	}
}


initSocket();

}
