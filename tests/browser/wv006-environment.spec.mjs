import {test,expect} from '@playwright/test';
for(const seed of ['WILLOW-1048','WV-SURFACES-2'])for(const quality of ['normal','low'])test(`WV006 paired surfaces ${seed} ${quality}`,async({page},info)=>{
 test.setTimeout(90000);const errors=[],external=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(new URL(r.url()).origin!=='http://127.0.0.1:4173')external.push(r.url());});
 let cameras=[];for(const treatment of ['before','after']){
 await page.goto(`/ui-kit/wv006-environment.html?seed=${seed}&quality=${quality}&motion=off&treatment=${treatment}`);
 await expect.poll(()=>page.evaluate(()=>{const h=window.environmentHarness;return h?.viewer.assetStatus().contextLoaded&&h.viewer.assetStatus().surfaceTexturesLoaded===2;}),{timeout:30000}).toBe(true);
 const current=[];for(const view of ['wide','near','lowpitch','highpitch','forest','cliff','junction','lake','river']){await page.locator('#'+view).click();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));current.push(await page.evaluate(()=>window.environmentHarness.viewer.getCamera()));await page.locator('#environment').screenshot({path:info.outputPath(`${treatment}-${view}.png`)});}
 cameras.push(current);expect(await page.evaluate(()=>window.environmentHarness.serializationUnchanged())).toBe(true);
 }expect(cameras[0]).toEqual(cameras[1]);expect(errors).toEqual([]);expect(external).toEqual([]);
});
for(const quality of ['normal','low'])test(`WV006 idle and hidden lifecycle ${quality}`,async({page})=>{
 await page.goto('/ui-kit/wv006-environment.html?quality='+quality);await expect.poll(()=>page.evaluate(()=>window.environmentHarness?.viewer.assetStatus().loaded)).toBe(14);
 const stats=()=>page.evaluate(()=>window.environmentHarness.viewer.assetStatus());const a=await stats();await page.waitForTimeout(400);const b=await stats();expect(b.surfaceControlBuilds).toBe(a.surfaceControlBuilds);if(quality==='low')expect(b.waterFrames).toBe(a.waterFrames);else expect(b.waterFrames).toBeGreaterThan(a.waterFrames);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});await page.waitForTimeout(200);const hidden=await stats();await page.waitForTimeout(300);expect((await stats()).waterFrames).toBe(hidden.waterFrames);await page.evaluate(()=>window.environmentHarness.viewer.dispose());
});
test('WV006 missing textures retain usable fallback and late loads cannot revive disposed scene',async({page})=>{
 await page.route('**/environment-v1/*.jpg',r=>r.abort());await page.goto('/ui-kit/wv006-environment.html?quality=low');await expect.poll(()=>page.evaluate(()=>window.environmentHarness?.viewer.assetStatus().surfaceTexturesFailed)).toBe(2);expect(await page.evaluate(()=>window.environmentHarness.viewer.assetStatus().drawCalls)).toBeGreaterThan(0);await page.evaluate(()=>window.environmentHarness.viewer.dispose());
 await page.unroute('**/environment-v1/*.jpg');await page.route('**/environment-v1/*.jpg',async r=>{await new Promise(resolve=>setTimeout(resolve,500));await r.continue();});await page.goto('/ui-kit/wv006-environment.html');await page.evaluate(()=>window.environmentHarness.viewer.dispose());await page.waitForTimeout(800);expect(await page.evaluate(()=>window.environmentHarness.viewer.assetStatus().disposed)).toBe(true);
});
for(const quality of ['normal','low'])test(`WV006 repeated worlds and 100-home budget ${quality}`,async({page})=>{
 test.setTimeout(60000);await page.goto(`/ui-kit/wv006-environment.html?count=100&quality=${quality}&motion=off`);await expect(page.locator('#environment')).toHaveAttribute('data-model-houses','100');await expect.poll(()=>page.evaluate(()=>window.environmentHarness?.viewer.assetStatus().surfaceTexturesLoaded)).toBe(2);
 const a=await page.evaluate(()=>window.environmentHarness.viewer.assetStatus());await page.evaluate(()=>{const h=window.environmentHarness;for(let i=0;i<6;i++){h.viewer.setWorld(h.world);h.viewer.setSettlement(h.state);}});const b=await page.evaluate(()=>window.environmentHarness.viewer.assetStatus());expect(b.geometries).toBe(a.geometries);expect(b.textures).toBe(a.textures);expect(b.drawCalls).toBeLessThanOrEqual(quality==='low'?100:150);expect(b.triangles).toBeLessThanOrEqual(quality==='low'?150000:250000);expect(await page.evaluate(()=>window.environmentHarness.serializationUnchanged())).toBe(true);
});
test('WV006 custom terrain shader responds to the coordinated light and explicit distance haze',async({page})=>{
 await page.goto('/ui-kit/wv006-environment.html?quality=low&motion=off');
 const pixels=await page.evaluate(async()=>{
  const T=await import('/assets/vendor/three.module.mjs'),{createEnvironmentMaterials}=await import('/environment-next/materials.mjs');
  const renderer=new T.WebGLRenderer({preserveDrawingBuffer:true,antialias:false});renderer.setSize(16,16);renderer.outputColorSpace=T.SRGBColorSpace;
  const scene=new T.Scene(),camera=new T.OrthographicCamera(-1,1,1,-1,.1,20);camera.position.z=5;
  const factory=createEnvironmentMaterials({loadTextures:false,low:true});factory.setWorld({width:10,depth:10,options:{},sample:()=>({height:0,water:null})});
  const geo=new T.PlaneGeometry(2,2);geo.setAttribute('color',new T.Float32BufferAttribute(Array(12).fill(.3),3));
  const material=factory.material(0);scene.add(new T.Mesh(geo,material));const gl=renderer.getContext();
  const read=()=>{renderer.render(scene,camera);const pixel=new Uint8Array(4);gl.readPixels(8,8,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);return [...pixel];};
  material.uniforms.sunDirection.value.set(0,0,1);const lit=read();material.uniforms.sunDirection.value.set(0,0,-1);const unlit=read();material.uniforms.fogRange.value.set(0,1);const hazed=read();
  geo.dispose();factory.dispose();renderer.dispose();renderer.forceContextLoss();return{lit,unlit,hazed};
 });expect(pixels.lit[0]).toBeGreaterThan(pixels.unlit[0]);expect(pixels.hazed).not.toEqual(pixels.unlit);expect(pixels.hazed[2]).toBeGreaterThan(pixels.unlit[2]);
});
