import test from 'node:test';
import assert from 'node:assert/strict';
import {validateFoundationSite} from '../foundation-system.mjs';
const world={width:400,depth:300,sample:(x,y)=>({height:x*.1,water:null}),slope:()=>.1};
const site={x:200,y:150};
test('rotated full footprint rejects flooded edges and interior hazards despite a safe center',()=>{
 assert.equal(validateFoundationSite(world,site,40,36,.3).ok,true);
 assert.match(validateFoundationSite(world,site,40,36,.3,{blocked:p=>p.x>213}).reason,/obstructs/);
 const flooded={...world,sample:(x,y)=>({height:0,water:x>213?3:null})};
 assert.equal(flooded.sample(site.x,site.y).water,null);
 assert.match(validateFoundationSite(flooded,site,40,36,.3).reason,/flooded/);
 const ridge={...world,slope:(x,y)=>x>212?.9:0};
 assert.match(validateFoundationSite(ridge,site,40,36,0).reason,/steep/);
 const interior={...world,slope:(x,y)=>Math.hypot(x-205,y-152)<5?1:0};
 assert.equal(validateFoundationSite(interior,site,40,36,0).ok,false);
});
test('placement rejects excessive relief/bounds and preserves legacy compatibility',()=>{
 assert.equal(validateFoundationSite(null,site,40,36).ok,true);
 assert.equal(validateFoundationSite(world,{x:3,y:3},40,36).ok,false);
 assert.equal(validateFoundationSite({...world,sample:x=>({height:x,water:null})},site,40,36).ok,false);
});
