(function(player) {

player.SPEED = 256;
player.CELL_INCREMENT = 64;

function Player(id, name) {
	syncem.SyncOb.call(this);
	
	this.id = id;
	this.index = null;
	this.teamIndex = -1;
	this.name = name;
	this.x8 = 100;
	this.y8 = 100;
	this.vx8 = 0;
	this.vy8 = 0;
}
Player.prototype = new syncem.SyncOb();
Player.prototype.constructor = Player;
player.Player = Player;
bserializer.registerClass(Player, {
	fields:[
		{name:'id',type:'string'},
		{name:'index',type:'uint32'},
		{name:'teamIndex',type:'int8'},
		{name:'name',type:'string'},
		{name:'x8',type:'uint32'},
		{name:'y8',type:'uint32'},
		{name:'vx8',type:'int16'},
		{name:'vy8',type:'int16'}
	]
});


Player.prototype.update = function(game_state) {

	this.x8 += this.vx8;
	this.y8 += this.vy8;

	//Wrapping
	while (this.x8 < 0) this.x8 += mygame.NUM_CELLS_X << 12;
	while (this.x8 >= mygame.NUM_CELLS_X << 12) this.x8 -= mygame.NUM_CELLS_X << 12;
	while (this.y8 < 0) this.y8 += mygame.NUM_CELLS_Y << 12;
	while (this.y8 >= mygame.NUM_CELLS_Y << 12) this.y8 -= mygame.NUM_CELLS_Y << 12;
	
	this.index = (this.y8 >> 12) * mygame.NUM_CELLS_X + (this.x8 >> 12);
	
	var cell = game_state.cells[this.index];
	var cellOutput = 0;
	
	for (var ti = 0, shift=0; ti < 3; ti++, shift+=8) {
		
		//Attempt ONE
//		if (ti === this.teamIndex) {
//			cell.strengths[ti] = Math.min(cell.strengths[ti] + player.CELL_INCREMENT, 255);
//		}
//		else {
//			cell.strengths[ti] = Math.max(0, cell.strengths[ti] - 16);
//		}

		//Attempt TWO
//		var fieldName = 'strength'+ti;
//		if (ti === this.teamIndex) {
//			cell[fieldName] = Math.min(cell[fieldName] + player.CELL_INCREMENT, 255);
//		}
//		else {
//			cell[fieldName] = Math.max(0, cell[fieldName] - 16);
//		}
//		
		//Attempt THREE
		if (ti === this.teamIndex) {
			cellOutput += Math.min(((cell>>shift)&255) + player.CELL_INCREMENT, 255) << shift;
		}
		else {
			cellOutput += Math.max(0, ((cell>>shift)&255) - 16) << shift;
		}
	}
	
	game_state.cells[this.index] = cellOutput;
};

Player.prototype.onDelete = function(state) {
};

function SetDestination(playerId, tx, ty) {
	syncem.SyncObjectMove.call(this, playerId);
	this.tx = tx;
	this.ty = ty;
}
SetDestination.prototype = new syncem.SyncObjectMove();
SetDestination.prototype.constructor = SetDestination;
player.SetDestination = SetDestination;
bserializer.registerClass(SetDestination, syncem.SyncObjectMove.fieldConfig.concat([
	{name:'tx',type:'uint16'},
	{name:'ty',type:'uint16'}
]));

SetDestination.prototype.applyTo = function(state, plyr) {
	var dx8 = (this.tx << 8) - plyr.x8;
	var dy8 = (this.ty << 8) - plyr.y8;
	var vs8 = player.SPEED / Math.sqrt(dx8 * dx8 + dy8 * dy8);
	plyr.vx8 = Math.round(dx8 * vs8);
	plyr.vy8 = Math.round(dy8 * vs8);
//	console.log("Applied move ",this,"to",plyr,dx8,dy8,dx8 * dx8 + dy8 * dy8,Math.sqrt(dx8 * dx8 + dy8 * dy8),vs8);
};

})(typeof exports === 'undefined'? this['player']={} : exports);