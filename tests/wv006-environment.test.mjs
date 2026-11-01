import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createVisualField,validateVisualInputs} from '../environment-next/visual-field.mjs';
import {createEnvironmentMaterials} from '../environment-next/materials.mjs';
import {attachAtmosphere} from '../environment-next/atmosphere.mjs';
import * as T from '../assets/vendor/three.module.mjs';
const world={width:100,depth:100,options:{seed:'field'},trees:[{x:25,z:25}],sample:(x,z)=>({height:5,water:x>75?6:null,kind:x>75?'lake':'land'})};
const inputs=[{envelope:[{x:10,z:10},{x:45,z:10},{x:40,z:40},{x:10,z:40}],path:[{x:15,z:25},{x:40,z:25}],radius:5,strength:.8}];
test('visual fields are deterministic, wet-safe, read-only and follow actual envelopes',()=>{
 const before=JSON.stringify([world,inputs]),a=createVisualField(world,{inputs}),b=createVisualField(world,{inputs});assert.deepEqual(a.visualData,b.visualData);assert.equal(JSON.stringify([world,inputs]),before);
 assert.equal(a.sample(25,25).forest,1);assert.equal(a.sample(50,50).wear,0);assert.equal(a.sample(35,25).wear,.8);assert.equal(a.sample(42,39).wear,0);assert.equal(a.sample(80,25).wet,true);assert.equal(a.sample(80,25).wear,0);assert.match(a.sample(80,25).shoreDistanceMethod,/not bathymetry/);assert.ok(a.sample(75,50).shoreDistance<a.sample(100,50).shoreDistance);assert.deepEqual(validateVisualInputs([{...inputs[0],radius:Infinity},{path:[]}]),[]);
 assert.equal(createVisualField(world,{low:true}).visualData.byteLength,64*48*4);
});
test('factory rebuilds on read input changes only, pauses safely, owns shared resources and disposes once',()=>{
 const e=createEnvironmentMaterials({loadTextures:false});e.setWorld(world);const a=e.material(0),b=e.material(1);assert.equal(a.uniforms.grass,b.uniforms.grass);for(let i=0;i<20;i++)e.advance(1000+i*16);assert.equal(e.status().surfaceControlBuilds,1);e.setVisualInputs(inputs);assert.equal(e.status().visualInputs,1);assert.equal(e.status().surfaceControlBuilds,2);const t=e.status().surfaceTime;e.pause();e.advance(100000);assert.equal(e.status().surfaceTime,t);assert.equal(e.material(3),null);e.dispose();e.dispose();e.setWorld(world);assert.equal(e.status().surfaceControlBuilds,2);assert.equal(e.material(0),null);
 const low=createEnvironmentMaterials({low:true,loadTextures:false});low.advance(100);low.advance(200);assert.equal(low.status().surfaceTime,0);low.dispose();
});
test('atmosphere detach restores the prior fog and preserves foreign nodes',()=>{const scene=new T.Scene(),old=new T.Fog('#ffffff',10,20),foreign=new T.Group();scene.fog=old;scene.add(foreign);const detach=attachAtmosphere(scene);assert.equal(scene.children.length,4);assert.notEqual(scene.fog,old);detach();detach();assert.equal(scene.fog,old);assert.deepEqual(scene.children,[foreign]);});
