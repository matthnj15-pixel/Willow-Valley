import test from 'node:test';
import assert from 'node:assert/strict';
import {projectEditorPoint} from '../editor-overlays.mjs';
const world={width:400,depth:300,sample:()=>({height:13.8})};
const camera={focusX:0,focusZ:0,yaw:0,pitch:1,zoom:200};
test('screen glyph projection matches orthographic world projection at focus and after zoom/rotation',()=>{
 assert.deepEqual(projectEditorPoint(world,camera,{width:600,height:800},{x:200,y:150}),{x:300,y:400});
 const point=projectEditorPoint(world,{...camera,zoom:100},{width:600,height:800},{x:210,y:150});
 assert.equal(point.x,340);assert.equal(point.y,400);
 const rotated=projectEditorPoint(world,{...camera,yaw:Math.PI/2},{width:600,height:800},{x:200,y:160});
 assert.ok(Math.abs(rotated.x-320)<1e-8);
});
