Syncem
======

This is a realtime network multiplayer demo using Node.js and Websocket.

Live Demo
---------

To see this example running, go to http://wivlaro.com:3001

The demo game is a multiplayer territory game. There are three teams, you click to move, 

Quick start
-----------

Make sure you have http://nodejs.org/ installed

```bash
  git clone https://github.com/wivlaro/syncem.git
  cd syncem
  npm install
  npm start
```

Navigate to http://localhost:3001

Directory structure
-------------------

public - static files served up
src - split into three categories, server and client, and common, which is code to run on both server and client
src/client/main.js - File that kicks off the whole process for the client. Hacking around with renderScene is probably most interesting
src/common/mygame.js - The core game logic - to be changed depending on the game
src/common/player.js - Contains the player class
src/common/bserializer.js - The binary serialization/deserialization component
src/common/syncem.js - The main engine for the network synchronization
src/common/bserializer_expansions.js - Automatically generated on the server dependent on registered classes
src/common/bserializer-cannon.js - bindings for the http://cannonjs.org/ physics library so you can include it in your world state
src/server/main.js - Hopefully self-explanatory
src/server/gameserver.js - Server-side plumbing for syncem for a game, user management
src/server/client.js - Server's model of a user, as connected to it

In theory you can hack around with main.js renderScene() and src/common/mygame.js and be able to make something. After rewriting common code, you will need to restart your server before reconnecting (or you will get out of sync problems). 

If the bottom status line says "Out of Sync" it could mean one of these things
 * the game logic is not deterministic
 * the game state is not completely/properly serialized
 * the client/server are not running the same version of the code (maybe restart the server and reconnect)

License
-------

It is available under the permissive MIT license, so please feel free to take anything you like, but a credit for substantial portions of code is appreciated. Moreover, it's nice to hear of it being used! :)

To-Do
-----

 * More commentry in the code documenting what is happening!
 * Abstract out the more boring stuff into more of a library
 * Make a convenience wrapper for declaring classes and bserializer.registerClass

Enjoy!
-Bill
