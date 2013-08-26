(function(mygame){
	
mygame.LPS = 30;

mygame.NUM_CELLS_X = 50;
mygame.NUM_CELLS_Y = 30;
//mygame.NUM_CELLS_X = 5;
//mygame.NUM_CELLS_Y = 3;


function Cell() {
	//ATTEMPT ONE:
//	this.strengths = [0,0,0];

	//ATTEMPT TWO:
	this.strength0 = 0;
	this.strength1 = 0;
	this.strength2 = 0;
}
bserializer.registerClass(Cell, [
	//ATTEMPT ONE:
//	{name:'strengths', type:'array', element:{type:'uint8'}}
//	
	//ATTEMPT TWO:
	{name:'strength0', type:'uint8'},
	{name:'strength1', type:'uint8'},
	{name:'strength2', type:'uint8'}
]);


function MyGame() {
	syncem.SyncRoot.apply(this);
	
//	this.cells = [];
//	for (var y = 0; y < mygame.NUM_CELLS_Y; y++) {
//		for (var x = 0; x < mygame.NUM_CELLS_X; x++) {
//			this.cells.push(new Cell());
//		}
//	}

	this.cells = new Uint32Array(mygame.NUM_CELLS_X * mygame.NUM_CELLS_Y);

	this.teamSizes = [0,0,0];
	this.weakestTeam = 0;
	this.teamScores = [0,0,0];
}
MyGame.prototype = new syncem.SyncRoot();
MyGame.prototype.constructor = MyGame;
mygame.MyGame = MyGame;
bserializer.registerClass(MyGame, {
	fields:[
		{name:'teamSizes', type:'array', element:{type:'uint8'}},
		{name:'teamScores', type:'array', element:{type:'float64'}},
		
		//Attempt ONE and TWO
//		{name:'cells', type:'array-rle', element:{type:Cell}},

		//Attempt THREE
		{name:'cells', type:Uint32Array}
	].concat(syncem.syncRootFields)
//	onPreWriteFields: function(p, src, objectdb) {
//	},
//	onPreReadFields: function(p, dst, objectdb) {
//	},
//	onPostReadFields: function(p, dst, objectdb) {
//	},
//	onPreCopyFields: function(dst, src, objectdb) {
//	},
//	onPostCopyFields: function(dst, src, objectdb) {
//	}
});


MyGame.prototype.initialise = function() {

};

MyGame.prototype.update = function() {
	syncem.SyncRoot.prototype.update.call(this);	
	
	for (var ti = 0; ti < this.teamSizes.length; ti++) {
		this.teamSizes[ti] = 0;
		this.teamScores[ti] = 0;
	}
	var keys = Object.keys(this.objects);
	keys.sort();
	for (var ki = 0; ki < keys.length; ki++) {
		var key = keys[ki];
		var obj = this.objects[key];
		obj.update(this);
		this.teamSizes[obj.teamIndex]++;
	}
	
	function getColourPresences(col) {
		col = ((col >> 4)&0x0f0f0f) | col;
		col = ((col >> 2)&0x030303) | col;
		return ((col >> 1) | col)&0x010101;
	}
	
	var NUM_CELLS = mygame.NUM_CELLS_X * mygame.NUM_CELLS_Y;
	for (var yoff0 = NUM_CELLS - mygame.NUM_CELLS_X*2, yoff1 = NUM_CELLS - mygame.NUM_CELLS_X, yoff2 = 0; yoff2 < NUM_CELLS; yoff0 = yoff1, yoff1 = yoff2, yoff2+=mygame.NUM_CELLS_X) {
		for (var xoff0 = mygame.NUM_CELLS_X - 2, xoff1 = mygame.NUM_CELLS_X - 1, xoff2 = 0; xoff2 < mygame.NUM_CELLS_X; xoff0 = xoff1, xoff1 = xoff2, xoff2++) {
	
			var cell =	this.cells[yoff1 + xoff1];
			var neighbourCounts = 
				getColourPresences(this.cells[yoff0 + xoff0]) +
				getColourPresences(this.cells[yoff0 + xoff1]) +
				getColourPresences(this.cells[yoff0 + xoff2]) +
				getColourPresences(this.cells[yoff1 + xoff0]) +
				getColourPresences(this.cells[yoff1 + xoff2]) +
				getColourPresences(this.cells[yoff2 + xoff0]) +
				getColourPresences(this.cells[yoff2 + xoff1]) +
				getColourPresences(this.cells[yoff2 + xoff2]);

			var cell_r = cell & 0xff;
			var cell_g = (cell>>8) & 0xff;
			var cell_b = (cell>>16) & 0xff;
			
			this.teamScores[0] += cell_r;
			this.teamScores[1] += cell_g;
			this.teamScores[2] += cell_b;

			var dec = 0, inc = 0;
			if (cell_r > 0 && (neighbourCounts & 0x0000ff) < 0x000003) dec += 0x000001;
			else if (cell_r < 255 && cell_r >= cell_b && cell_r >= cell_g  && (neighbourCounts & 0x0000ff) > 0x000005) inc += 0x000001;
			if (cell_g > 0 && (neighbourCounts & 0x00ff00) < 0x000300) dec += 0x000100;
			else if (cell_g < 255 && cell_g >= cell_b && cell_g >= cell_r  && (neighbourCounts & 0x00ff00) > 0x000500) inc += 0x000100;
			if (cell_b > 0 && (neighbourCounts & 0xff0000) < 0x030000) dec += 0x010000;
			else if (cell_b < 255 && cell_b >= cell_g && cell_b >= cell_r && (neighbourCounts & 0xff0000) > 0x050000) inc += 0x010000;
			this.cells[yoff1 + xoff1] = (cell - dec) + inc;
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
