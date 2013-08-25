(function(mygame){
	
mygame.LPS = 32;

mygame.NUM_CELLS_X = 50;
mygame.NUM_CELLS_Y = 30;


function Cell() {
	this.red = 0;
	this.green = 0;
	this.blue = 0;
}
bserializer.registerClass(Cell, [
	{name:'red', type:'uint8'},
	{name:'green', type:'uint8'},
	{name:'blue', type:'uint8'}
]);


function MyGame() {
	syncem.SyncRoot.apply(this);
	
	this.cells = [];
	for (var y = 0; y < mygame.NUM_CELLS_Y; y++) {
		for (var x = 0; x < mygame.NUM_CELLS_X; x++) {
			this.cells.push(new Cell());
		}
	}
	this.teamSizes = [0,0,0];
	this.weakestTeam = 0;
}
MyGame.prototype = new syncem.SyncRoot();
MyGame.prototype.constructor = MyGame;
mygame.MyGame = MyGame;
bserializer.registerClass(MyGame, {
	fields:[
		{name:'cells', type:'array-rle', element:{type:Cell}},
		{name:'teamSizes', type:'array', element:{type:'uint8'}}
//		{name:'seed', type:'uint32', serialize:false},
//		{name:'world', type:CANNON.World},
//		{name:'organisations'},
//		{name:'grid', type:'array', element:{type:['undefined',building.Building]}},
//		{name:'config', type:'object'},
//		{name:'technologies', serialize:false, directCopy:true},
//		{name:'rostrums', serialize:false, directCopy:true},
//		{name:'currentRostrum', type:'uint8'}
	].concat(syncem.syncRootFields),
	onPreWriteFields: function(p, src, objectdb) {
	},
	onPreReadFields: function(p, dst, objectdb) {
	},
	onPostReadFields: function(p, dst, objectdb) {
	},
	onPreCopyFields: function(dst, src, objectdb) {
	},
	onPostCopyFields: function(dst, src, objectdb) {
	}
});


MyGame.prototype.initialise = function() {

};

MyGame.prototype.update = function() {
	syncem.SyncRoot.prototype.update.call(this);	
	
	for (var ti = 0; ti < this.teamSizes.length; ti++) {
		this.teamSizes[ti] = 0;
	}
	var keys = Object.keys(this.objects);
	keys.sort();
	for (var ki = 0; ki < keys.length; ki++) {
		var key = keys[ki];
		var obj = this.objects[key];
		obj.update(this);
		this.teamSizes[obj.teamIndex]++;
	}
	
	for (var ci = 0; ci < this.cells.length; ci++) {
		var cell = this.cells[ci];
		if (cell.strength > 0) {
			cell.strength -= 1;
		}
	}
	
	this.weakestTeam = 0;
	for (var ti = 1; ti < this.teamSizes.length; ti++) {
		if (this.teamSizes[ti] < this.teamSizes[this.weakestTeam]) {
			this.weakestTeam = ti;
		}
	}
};

MyGame.prototype.getCheckData = function () {
	return bserializer.serialize(this, {objectFieldSort:true});
};

	
})(typeof exports === 'undefined' ? this.mygame || ( this.mygame = {} ) : exports);
