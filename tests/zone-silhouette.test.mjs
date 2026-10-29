import test from "node:test";
import assert from "node:assert/strict";
import {zoneSilhouette} from "../zone-silhouette.mjs";
test("WORLD-ZONE-01: overlapping brush circles yield one smooth border",()=>{
 const z=[{radius:40,points:[{x:200,y:200},{x:218,y:202},{x:234,y:206}]}];
 const d=zoneSilhouette(z);
 assert.equal((d.match(/M /g)||[]).length,1);
 assert.ok(d.includes(" Q "));
 assert.equal(d,zoneSilhouette(z));
});
test("WORLD-ZONE-02: detached patches have separate perimeters",()=>{
 const d=zoneSilhouette([{radius:24,points:[{x:100,y:100},{x:420,y:400}]}]);
 assert.equal((d.match(/M /g)||[]).length,2);
 assert.equal(zoneSilhouette([]),"");
});
