import {test,expect} from '@playwright/test';
for(const scope of ['/','/dev/'])test(`B3 playable Three.js cottages and cold offline relaunch ${scope}`,async({page,context},info)=>{
 const errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!=='http://127.0.0.1:4173')external.push(r.url());});
 await page.goto(scope+'?preview=1&renderer=three');
 await expect(page.locator('#game3D')).toHaveAttribute('data-renderer','three');
 await expect(page.locator('#game3D')).toHaveAttribute('data-loaded-models','13');
 await expect.poll(()=>page.locator('#game3D').getAttribute('data-model-houses')).not.toBe('0');
 await page.screenshot({path:info.outputPath('playable-three-cottages.png')});
 await page.locator('#nextBtn').click();await expect(page.locator('#calendar')).toContainText('April');
 await page.evaluate(async()=>{await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;});
 await context.setOffline(true);await page.goto(scope+'?preview=1');
 await expect(page.locator('#game3D')).toHaveAttribute('data-loaded-models','13');
 await expect(page.locator('#calendar')).toContainText('April');
 expect(errors).toEqual([]);expect(external).toEqual([]);
});
test('B3 context loss falls back to native WebGL and retains camera and settlement',async({page})=>{
 await page.goto('/?preview=1&renderer=three');await expect(page.locator('#game3D')).toHaveAttribute('data-loaded-models','13');
 const zoom=await page.locator('#stage').getAttribute('data-camera-zoom');
 await page.evaluate(()=>document.querySelector('#game3D').dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
 await expect(page.locator('#game3D')).toHaveAttribute('data-renderer','webgl');
 await expect(page.locator('#stage')).toHaveAttribute('data-camera-zoom',zoom);
 await page.locator('#nextBtn').click();await expect(page.locator('#calendar')).toContainText('April');
});
test('B3 missing model retains playable shell and WebGL2 boot failure uses native fallback',async({page})=>{
 await page.route('**/home-*.glb',r=>r.abort());
 await page.goto('/?preview=1&renderer=three');await expect(page.locator('#game3D')).toHaveAttribute('data-model-houses','0');
 await page.locator('#nextBtn').click();await expect(page.locator('#calendar')).toContainText('April');
 await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...rest){return type==='webgl2'?null:get.call(this,type,...rest);};});
 await page.reload();await expect(page.locator('#game3D')).toHaveAttribute('data-renderer','webgl');
 await expect(page.locator('#calendar')).toContainText('April');
});
test('B3 read-only scene, read-only state and displayed-terrain picking',async({page},info)=>{
 await page.goto('/?preview=1');
 const result=await page.evaluate(async()=>{
  const {mountWorld3D}=await import('/world-renderer-three.mjs');
  const {mountWorld3D:legacy}=await import('/ui-kit/render-3d.mjs');
  const world={width:400,depth:300,options:{seed:19},trees:[],slope:()=>.1,sample:(x,y)=>({height:8+x*.04+y*.02,water:null})};
  const state={turn:1,houses:[{id:1,x:205,y:150,entrance:{x:230,y:150}}],buildings:[],roads:[],zones:[],localLanes:[],desirePaths:[]};
  const freeze=o=>{Object.freeze(o);for(const v of Object.values(o))if(v&&typeof v==='object')freeze(v);};freeze(state);
  const before=JSON.stringify(state),canvas=document.createElement('canvas');canvas.id='parityScene';canvas.style='position:fixed;inset:0;width:100vw;height:100vh;z-index:9999';document.body.append(canvas);
  const r=mountWorld3D(canvas,world,{interactive:false,quality:'game'});r.setSettlement(state);r.focusOn(215,160,160);r.navigateTouches({yawDelta:.4,pitchDelta:-.2,zoomRatio:.8});
  await new Promise(resolve=>setTimeout(resolve,400));
  const c=document.createElement('canvas');c.style.cssText=canvas.style.cssText;document.body.append(c);const old=legacy(c,world,{interactive:false,quality:'lite'});old.setCamera(r.getCamera());
  const point=r.screenToWorld(300,425),expected=old.screenToWorld(300,425);old.dispose();c.remove();
  const counts=[];
  for(let i=0;i<20;i++){
   r.setWorld(world,false);r.setSettlement(state);r.setCamera(old.getCamera());
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   counts.push(r.assetStatus());
  }
  window.parityRenderer=r;
  return {counts,unchanged:before===JSON.stringify(state),point,expected};
 });
 expect(result.counts.at(-1).geometries).toBeLessThanOrEqual(result.counts[0].geometries);
 expect(result.counts.at(-1).textures).toBeLessThanOrEqual(result.counts[0].textures);
 expect(result.unchanged).toBe(true);expect(result.point.x).toBeCloseTo(result.expected.x,2);expect(result.point.y).toBeCloseTo(result.expected.y,2);
 await page.screenshot({path:info.outputPath('three-hill-seat.png')});
 await page.evaluate(()=>window.parityRenderer.dispose());
});

test('C1 seeded 30-house hamlet uses all six fitted local silhouettes',async({page},info)=>{
 await page.goto('/?preview=1&renderer=three');
 await page.evaluate(async()=>{
  const {mountWorld3D}=await import('/world-renderer-three.mjs');
  const world={width:600,depth:500,options:{seed:'WV-C01-hamlet30'},trees:[],slope:()=>.1,
   sample:(x,y)=>({height:10+Math.sin(x/90)*3+Math.cos(y/90)*2,water:null})};
  const houses=Array.from({length:30},(_,i)=>{
   const x=75+(i%6)*75+Math.sin(i*3)*13+Math.floor(i/6)*3,y=75+Math.floor(i/6)*75+Math.cos(i*2)*16;
   return {id:i,x,y,foundedEra:0,foundedTurn:0,entrance:{x:x+Math.sin(i)*10,y:y+25},parcel:{vertices:[{x:x-28,y:y-28},{x:x+28,y:y-28},{x:x+28,y:y+28},{x:x-28,y:y+28}]}};
  });
  const state={turn:2,houses,roads:[[{x:30,y:425},{x:570,y:425}]],buildings:['farm','lumber','smith','granary','market','plaza','park'].map((type,i)=>({id:100+i,type,x:60+i*80,y:460})),zones:[],desirePaths:[],localLanes:Array.from({length:5},(_,row)=>({points:houses.slice(row*6,row*6+6).map(h=>h.entrance)}))};
  const canvas=document.createElement('canvas');canvas.id='hamlet30';canvas.style='position:fixed;inset:0;width:100vw;height:100vh;z-index:9999';document.body.append(canvas);
  const r=mountWorld3D(canvas,world,{quality:'game',interactive:false});r.setSettlement(state);r.focusOn(300,250,500);window.hamletRenderer=r;
 });
 await expect(page.locator('#hamlet30')).toHaveAttribute('data-loaded-models','13');
 await expect(page.locator('#hamlet30')).toHaveAttribute('data-model-houses','30');
 expect((await page.locator('#hamlet30').getAttribute('data-home-models')).split(',')).toHaveLength(6);
 await expect(page.locator('#hamlet30')).toHaveAttribute('data-model-facilities','7');
 await page.screenshot({path:info.outputPath('hamlet30-six-homes.png')});
 await page.evaluate(()=>window.hamletRenderer.navigateTouches({yawDelta:.4,pitchDelta:-.4,zoomRatio:.85}));
 await page.screenshot({path:info.outputPath('hamlet30-all-seven-low-view.png')});
 await page.evaluate(()=>window.hamletRenderer.dispose());
});

test('C2 four working facility compositions and committed farmland on terrain',async({page},info)=>{
 await page.goto('/?preview=1&renderer=three');
 await page.evaluate(async()=>{
  const {mountWorld3D}=await import('/world-renderer-three.mjs');
  const world={width:600,depth:400,options:{seed:'WV-C2-facilities'},trees:[],slope:()=>.1,sample:(x,y)=>({height:10+x*.01+y*.01,water:null})};
  const state={turn:1,houses:[],buildings:['farm','lumber','smith','granary'].map((type,i)=>({id:i,type,x:110+i*125,y:130})),roads:[[{x:40,y:190},{x:560,y:190}]],localLanes:[],zones:[{type:'farmland',radius:80,points:[{x:110,y:220}]}],desirePaths:[]};
  const canvas=document.createElement('canvas');canvas.id='workingScene';canvas.style='position:fixed;inset:0;width:100vw;height:100vh;z-index:9999';document.body.append(canvas);
  const r=mountWorld3D(canvas,world,{quality:'game',interactive:false});r.setSettlement(state);r.focusOn(300,155,280);window.facilityRenderer=r;window.facilityState=state;
 });
 await expect(page.locator('#workingScene')).toHaveAttribute('data-model-facilities','4');
 await expect.poll(()=>page.locator('#workingScene').getAttribute('data-crop-rows')).not.toBe('0');
 await page.screenshot({path:info.outputPath('working-facilities-and-fields.png')});
 await page.evaluate(()=>window.facilityRenderer.setSettlement({...window.facilityState,zones:[]}));
 await expect(page.locator('#workingScene')).toHaveAttribute('data-crop-rows','0');
 await page.evaluate(()=>window.facilityRenderer.dispose());
});

test('C3 marketplace, plaza and park stay open on sloping terrain',async({page},info)=>{
 await page.goto('/?preview=1&renderer=three');
 await page.evaluate(async()=>{
  const {mountWorld3D}=await import('/world-renderer-three.mjs');
  const world={width:400,depth:300,options:{seed:'WV-C3-public'},trees:[],slope:()=>.1,sample:(x,y)=>({height:10+x*.05+y*.02,water:null})};
  const state={turn:1,houses:[],buildings:['market','plaza','park'].map((type,i)=>({id:i,type,x:80+i*120,y:140})),roads:[[{x:30,y:195},{x:370,y:195}]],localLanes:[],zones:[],desirePaths:[]};
  const canvas=document.createElement('canvas');canvas.id='publicScene';canvas.style='position:fixed;inset:0;width:100vw;height:100vh;z-index:9999';document.body.append(canvas);
  const r=mountWorld3D(canvas,world,{quality:'game',interactive:false});r.setSettlement(state);r.focusOn(200,160,210);window.publicRenderer=r;
 });
 await expect(page.locator('#publicScene')).toHaveAttribute('data-model-facilities','3');
 await page.screenshot({path:info.outputPath('market-plaza-park-slope.png')});
 await page.evaluate(()=>window.publicRenderer.dispose());
});
