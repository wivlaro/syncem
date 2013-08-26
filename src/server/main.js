//require('webkit-devtools-agent'); //For the profiler

var path = require('path');

global.PROJ_ROOT = path.normalize(__dirname + '/../..');

var express = require('express'),
	http = require('http'),
	fs = require('fs'),
	ws = require('ws');
	
var conf = require(PROJ_ROOT + '/conf');

var gameserver = require(PROJ_ROOT + '/src/server/gameserver.js');
var client = require(PROJ_ROOT + '/src/server/client.js');

var parseCookie = express.cookieParser(conf.session_secret);

var gameServer;

var app = express(),
	server = http.createServer(app);
	
var wss = new ws.Server({server: server});

app.configure(function() {
	app.set('port', process.env.PORT || 3001);
	app.set('views', PROJ_ROOT + '/views');
	app.set('view engine', 'hjs');
	app.use(express.favicon(PROJ_ROOT+'/public/favicon.ico'));
	app.use(express.bodyParser());
	app.use(app.router);
	app.use(parseCookie);
	app.use(express.session({secret:conf.session_secret, key:'connect.sid'}));
	app.use('/client', express.static(PROJ_ROOT + '/src/client'));
	app.use('/common', express.static(PROJ_ROOT + '/src/common'));
	app.use('/get-uid.js', function(req, res) {
		res.type('text/javascript');
		res.send('syncem.uniqSeed = ' + JSON.stringify(syncem.makeUid()) + ';');
	});
	app.use(express.static(PROJ_ROOT + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

server.listen(app.get('port'), function(){
	console.log("Express server listening on port " + app.get('port'));
	gameServer = new gameserver.GameServer();
});

wss.on('error', function() {
	console.error("WebSocketServer error:", arguments);
});

wss.on('connection', function (socket) {
	if (gameServer.numActiveSessions >= conf.max_players) {
		socket.close(4005, 'Server full. Sorry, please try again later.');
		return;
	}
    parseCookie(socket.upgradeReq, null, function(err) {
		 var session_id = socket.upgradeReq.signedCookies['connect.sid'];
		if (err) {
			socket.close(4000, err);
		}
		else if (!session_id) {
			socket.close(4001, 'Failed to get sessionID: '+session_id);
		}
		else {
			gameServer.clientSocketOpened(session_id, socket, socket.upgradeReq.connection);
		}
    }); 
});