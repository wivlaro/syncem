
var particle_fields = [
	{name: 'index', type: ['undefined','int32']},
	{name: 'type', type: 'string'},
	{name: 'mass', type: 'float64'},
	{name: 'invMass', type: 'float64'},
	{name: 'material', type: ['undefined', CANNON.Material]},
	{name: 'world', type: ['null', CANNON.World], serialize:false},
	{name: 'position', type: CANNON.Vec3},
	{name: 'velocity', type: CANNON.Vec3},
	{name: 'force', type: CANNON.Vec3},
	{name: 'linearDamping', type: 'float64'},
	{name: 'motionstate', type: 'int8'},
	{name: 'collisionResponse', type: ['true','false']},
	{name: 'allowSleep', type: ['true','false']},
	{name: 'sleepState', type: 'int8'},
	{name: 'sleepSpeedLimit', type: 'float64'},
	{name: 'sleepTimeLimit', type: 'float64'},
	{name: 'timeLastSleepy', type: 'float64'},
	{name: 'collisionFilterGroup', type:'int32'},
	{name: 'collisionFilterMask', type:'int32'}];
bserializer.registerClass(CANNON.Particle, {
	circular: true,
	fields: particle_fields.slice()
});

bserializer.registerClass(CANNON.RigidBody, {
	circular: true,
	ctor_args: ['mass',
				'shape',
				'material'],
	fields:particle_fields.concat([
		{name: 'tau', type:CANNON.Vec3},
		{name: 'quaternion', type:CANNON.Quaternion},
		{name: 'angularVelocity', type:CANNON.Vec3},
		{name: 'inertia', type:CANNON.Vec3},
		{name: 'invInertia', type:CANNON.Vec3},
		{name:'angularDamping', type:'float64'},
		{name:'shape', static:true},
		{name: 'aabbmin', type:CANNON.Vec3},
		{name: 'aabbmax', type:CANNON.Vec3},
		'adust_object'])
});
CANNON.RigidBody.prototype.writeStaticBodyStateFields = function(p, objectdb) {
	p.writeSmartUint(this.index);
	p.writeUint8(this.sleepState);
	p.writeFloat64(this.timeLastSleepy);
};

CANNON.RigidBody.prototype.readStaticBodyStateFields = function(p, objectdb) {
	this.index = p.readSmartUint();
	this.sleepState = p.readUint8();
	this.timeLastSleepy = p.readFloat64();
};
CANNON.RigidBody.prototype.copyStaticBodyStateFieldsFrom = function(src, objectdb) {
	this.index = src.index;
	this.sleepState = src.sleepState;
	this.timeLastSleepy = src.timeLastSleepy;
};

CANNON.StaticRigidBody = function() {
	CANNON.RigidBody.apply(this, arguments);
};
CANNON.StaticRigidBody.prototype = new CANNON.RigidBody(-1, new CANNON.Sphere(1));
CANNON.StaticRigidBody.prototype.constructor = CANNON.StaticRigidBody;
bserializer.registerClass(CANNON.StaticRigidBody, {
	circular: true,
	fields:[
		{name: 'index', type: ['undefined','int32']},
		'adust_object']
});

bserializer.registerClass(CANNON.Material,{
	circular:true,
	fields: [
		{name:'id', type:'float64'},
		{name:'name', type:'string'}
	]
});
bserializer.registerClass(CANNON.ContactMaterial, {
	circular:true,
	fields: [
		{name:'id',type:'float64'},
		{name:'materials',type:'array',element:{type:CANNON.Material}},
		{name:'friction',type:'float64'},
		{name:'restitution',type:'float64'},
		{name:'contactEquationStiffness',type:'float64'},
		{name:'contactEquationRegularizationTime',type:'float64'},
		{name:'frictionEquationStiffness',type:'float64'},
		{name:'frictionEquationRegularizationTime',type:'float64'}
	]
});

var shape_fields = [
//	{name:'type', type:'int8'},
	'aabbmin',
	'aabbmax',
	{name:'boundingSphereRadius', type:'float64'}
];
bserializer.registerClass(CANNON.Shape, {fields:shape_fields.slice()});
bserializer.registerClass(CANNON.Box, {
	ctor_args:['halfExtents'], 
	fields:shape_fields.concat([
		'halfExtents'
//		['convexPolyhedronRepresentation', 'depends', 'halfExtents']
//		{name:'convexPolyhedronRepresentation', static:true}
		]),
	onPreWriteFields:function(p,src,objectdb) {
		//Ensure it gets updated (mainly for comparison)
		src.getBoundingSphereRadius();
	},
	onPostReadFields:function(p,dst,objectdb) {
//		console.log("Box Config onPostReadFields ",dst.boundingSphereRadius,dst.boundingSphereRadiusNeedsUpdate);
		//Ensure it gets updated
		dst.getBoundingSphereRadius();
	}
});
bserializer.registerClass(CANNON.Plane, {fields:shape_fields.slice()});
bserializer.registerClass(CANNON.Sphere, {fields:shape_fields.concat([{name:'radius', type:'float64'}])});
bserializer.registerClass(CANNON.Compound, {fields:shape_fields.concat(['childShapes', 'childOffsets', 'childOrientations'])});
bserializer.registerClass(CANNON.ConvexPolyhedron, {
	ctor_args: ['vertices', 'faces', 'faceNormals'],
	fields:shape_fields.concat([
		{name:'vertices', type:'array', element:{type:CANNON.Vec3}},
		{name:'faces', type:'array', element:{type:'array', element:{type:'smartuint'}}},
		{name:'faceNormals', type:'array', element:{type:CANNON.Vec3}},
		{name:'uniqueEdges', type:'array', element:{type:CANNON.Vec3}}])
});

bserializer.registerClass(CANNON.Vec3, {
	fields:[
		{name:'x',type:'float64'},
		{name:'y',type:'float64'},
		{name:'z',type:'float64'}
	]
});
bserializer.registerClass(CANNON.Quaternion, {
	fields:[
		{name:'x',type:'float64'},
		{name:'y',type:'float64'},
		{name:'z',type:'float64'},
		{name:'w',type:'float64'}
	]
});

bserializer.registerClass(CANNON.World, {
	circular: true,
	fields: [
		{name: 'time', type: 'float64'},
		{name: 'stepnumber', type: 'int32'},
		{name: 'nextId', type: 'int32'},
		{name: 'allowSleep', type: 'boolean', serialize:false},
		{name: 'defaultContactMaterial', serialize:false},
		{name: 'collisionMatrix', type: 'array-rle'},
		{name: 'collisionMatrixPrevious', type: 'array-rle'},
		{name: 'gravity', type: CANNON.Vec3, serialize:false}
//		,
//		{name: 'bodies', type: 'array', element:{type:[CANNON.Particle, CANNON.RigidBody]}, serialize:false}
	]
});
bserializer.registerClass(CANNON.Solver);
bserializer.registerClass(CANNON.Broadphase);
bserializer.registerClass(CANNON.NaiveBroadphase);
bserializer.registerClass(CANNON.GridBroadphase);