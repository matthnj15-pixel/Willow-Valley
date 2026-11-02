import {test,expect} from '@playwright/test';
for(const seed of ['WILLOW-1048','WV-SURFACES-2'])for(const quality of ['normal','low'])test(`WV006 paired surfaces ${seed} ${quality}`,async({page},info)=>{
 test.setTimeout(90000);const errors=[],external=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(new URL(r.url()).origin!=='http://127.0.0.1:4173')external.push(r.url());});
 let cameras=[];for(const treatment of ['previous','after']){
 await page.goto(`/ui-kit/wv006-environment.html?seed=${seed}&quality=${quality}&motion=off&treatment=${treatment}`);
 await expect.poll(()=>page.evaluate(()=>{const h=window.environmentHarness;return h?.viewer.assetStatus().contextLoaded&&h.viewer.assetStatus().surfaceTexturesLoaded===(h.viewer.assetStatus().surfaceTexturesExpected||2);}),{timeout:30000}).toBe(true);
 const current=[];for(const view of ['ground','detail','wide','near','lowpitch','highpitch','forest','cliff','junction','lake','river']){await page.locator('#'+view).click();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));current.push(await page.evaluate(()=>window.environmentHarness.viewer.getCamera()));await page.locator('#environment').screenshot({path:info.outputPath(`${treatment}-${view}.png`)});}
 cameras.push(current);expect(await page.evaluate(()=>window.environmentHarness.serializationUnchanged())).toBe(true);
 }expect(cameras[0]).toEqual(cameras[1]);expect(errors).toEqual([]);expect(external).toEqual([]);
});
for(const quality of ['normal','low'])test(`WV006 idle and hidden lifecycle ${quality}`,async({page})=>{
 await page.goto('/ui-kit/wv006-environment.html?treatment=after&quality='+quality);await expect.poll(()=>page.evaluate(()=>{const s=window.environmentHarness?.viewer.assetStatus();return s?.contextLoaded&&s.loaded===s.total&&s.surfaceTexturesLoaded===(s.surfaceTexturesExpected||2);})).toBe(true);
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const stats=()=>page.evaluate(()=>window.environmentHarness.viewer.assetStatus());const a=await stats();await page.waitForTimeout(400);const b=await stats();expect(b.surfaceControlBuilds).toBe(a.surfaceControlBuilds);if(quality==='low')expect(b.waterFrames).toBe(a.waterFrames);else expect(b.waterFrames).toBeGreaterThan(a.waterFrames);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});await page.waitForTimeout(200);const hidden=await stats();await page.waitForTimeout(300);expect((await stats()).waterFrames).toBe(hidden.waterFrames);await page.evaluate(()=>window.environmentHarness.viewer.dispose());
});
test('WV006 missing textures retain usable fallback and late loads cannot revive disposed scene',async({page})=>{
 const textures=/\/assets\/wv\/(environment-v1|environment-next)\/.*\.(jpg|png)$/;
 await page.route(textures,r=>r.abort());await page.goto('/ui-kit/wv006-environment.html?treatment=after&quality=low');await expect.poll(()=>page.evaluate(()=>window.environmentHarness?.viewer.assetStatus().surfaceTexturesFailed)).toBe(3);expect(await page.evaluate(()=>window.environmentHarness.viewer.assetStatus().drawCalls)).toBeGreaterThan(0);await page.evaluate(()=>window.environmentHarness.viewer.dispose());
 await page.unroute(textures);await page.route(textures,async r=>{await new Promise(resolve=>setTimeout(resolve,500));await r.continue();});await page.goto('/ui-kit/wv006-environment.html?treatment=after');await page.evaluate(()=>window.environmentHarness.viewer.dispose());await page.waitForTimeout(800);expect(await page.evaluate(()=>window.environmentHarness.viewer.assetStatus().disposed)).toBe(true);
});
for(const quality of ['normal','low'])test(`WV006 repeated worlds and 100-home budget ${quality}`,async({page})=>{
 test.setTimeout(60000);await page.goto(`/ui-kit/wv006-environment.html?treatment=after&count=100&quality=${quality}&motion=off`);await expect(page.locator('#environment')).toHaveAttribute('data-model-houses','100');await expect.poll(()=>page.evaluate(()=>{const s=window.environmentHarness?.viewer.assetStatus();return s&&s.surfaceTexturesLoaded===s.surfaceTexturesExpected;})).toBe(true);
 const a=await page.evaluate(()=>window.environmentHarness.viewer.assetStatus());await page.evaluate(()=>{const h=window.environmentHarness;for(let i=0;i<6;i++){h.viewer.setWorld(h.world);h.viewer.setSettlement(h.state);}});const b=await page.evaluate(()=>window.environmentHarness.viewer.assetStatus());expect(b.geometries).toBe(a.geometries);expect(b.textures).toBe(a.textures);expect(b.textureBytes).toBeLessThanOrEqual(48*1024*1024);expect(b.drawCalls).toBeLessThanOrEqual(quality==='low'?100:150);expect(b.triangles).toBeLessThanOrEqual(quality==='low'?150000:250000);expect(await page.evaluate(()=>window.environmentHarness.serializationUnchanged())).toBe(true);
});
test('WV006 custom terrain shader responds to the coordinated light and explicit distance haze',async({page})=>{
 await page.goto('/ui-kit/wv006-environment.html?treatment=after&quality=low&motion=off');
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
test('WV006 normal data changes relief lighting; low requests no normal maps',async({page})=>{
 await page.goto('/ui-kit/wv006-environment.html?treatment=after&quality=normal&motion=off');
 const result=await page.evaluate(async()=>{
  const T=await import('/assets/vendor/three.module.mjs'),{createEnvironmentMaterials}=await import('/environment-next/materials.mjs');
  const renderer=new T.WebGLRenderer({preserveDrawingBuffer:true,antialias:false});renderer.setSize(16,16);const scene=new T.Scene(),camera=new T.OrthographicCamera(-1,1,1,-1,.1,20);camera.position.z=5;
  const factory=createEnvironmentMaterials({loadTextures:false}),material=factory.material(0),geo=new T.PlaneGeometry(2,2);geo.setAttribute('color',new T.Float32BufferAttribute(Array(12).fill(.3),3));
  const normal=new T.DataTexture(new Uint8Array([235,80,200,255]),1,1);normal.needsUpdate=true;material.uniforms.rockNormal.value=normal;material.uniforms.sunDirection.value.set(.8,.1,.5).normalize();scene.add(new T.Mesh(geo,material));
  const gl=renderer.getContext(),read=()=>{renderer.render(scene,camera);const p=new Uint8Array(4);gl.readPixels(8,8,1,1,gl.RGBA,gl.UNSIGNED_BYTE,p);return [...p];};material.uniforms.normalStrength.value=0;const flat=read();material.uniforms.normalStrength.value=1;const relief=read();
  factory.dispose();normal.dispose();geo.dispose();renderer.dispose();renderer.forceContextLoss();return{flat,relief};
 });expect(Math.abs(result.flat[0]-result.relief[0])).toBeGreaterThan(5);
 const normals=[];page.on('request',r=>{if(r.url().endsWith('-normal.png'))normals.push(r.url());});await page.goto('/ui-kit/wv006-environment.html?treatment=after&quality=low&motion=off');await expect.poll(()=>page.evaluate(()=>window.environmentHarness?.viewer.assetStatus().surfaceTexturesLoaded)).toBe(3);expect(normals).toEqual([]);
});
test('WV006 absent normal resources preserve colour rendering and flat-light fallback',async({page})=>{
 const shaderErrors=[];page.on('pageerror',e=>shaderErrors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&m.text().includes('WebGLProgram'))shaderErrors.push(m.text());});await page.route('**/*-normal.png',r=>r.abort());await page.goto('/ui-kit/wv006-environment.html?treatment=after&quality=normal&motion=off');await expect.poll(()=>page.evaluate(()=>{const s=window.environmentHarness?.viewer.assetStatus();return s?.surfaceTexturesFailed===3&&s.surfaceTexturesLoaded===3;})).toBe(true);expect(await page.evaluate(()=>window.environmentHarness.viewer.assetStatus().drawCalls)).toBeGreaterThan(0);expect(shaderErrors).toEqual([]);
});
test('WV006 inspection keeps close zoom through wheel and touch while preserving state',async({page})=>{
 await page.goto('/ui-kit/wv006-environment.html?treatment=after&quality=low&view=ground&motion=off');await expect.poll(()=>page.evaluate(()=>window.environmentHarness?.viewer.assetStatus().surfaceTexturesLoaded)).toBe(3);const canvas=page.locator('#environment');await canvas.scrollIntoViewIfNeeded();const box=await canvas.boundingBox();await page.mouse.move(box.x+box.width*.5,box.y+100);await page.mouse.wheel(0,20);let v=await page.evaluate(()=>window.environmentHarness.viewer.getCamera());expect(v.zoom).toBeGreaterThan(7);expect(v.zoom).toBeLessThan(10);
 await page.evaluate(()=>{const c=document.querySelector('#environment'),rect=c.getBoundingClientRect(),emit=(type,id,x,y)=>c.dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType:'touch',clientX:rect.left+x,clientY:rect.top+y,bubbles:true,cancelable:true}));emit('pointerdown',11,180,150);emit('pointerdown',12,280,150);emit('pointermove',12,330,150);emit('pointerup',11,180,150);emit('pointerup',12,330,150);});v=await page.evaluate(()=>window.environmentHarness.viewer.getCamera());expect(v.zoom).toBe(6);await page.locator('#detail').click();expect(await page.evaluate(()=>window.environmentHarness.viewer.getCamera().focusY)).toBe(17);const result=await page.evaluate(()=>window.environmentHarness.measure(.05,0));expect(result.initialCamera.focusY).toBe(17);await page.locator('#cliff').click();await canvas.scrollIntoViewIfNeeded();await page.mouse.move(box.x+box.width*.5,box.y+100);for(let i=0;i<8;i++)await page.mouse.wheel(0,-20);expect(await page.evaluate(()=>window.environmentHarness.viewer.getCamera().zoom)).toBeLessThan(128);expect(await page.evaluate(()=>window.environmentHarness.serializationUnchanged())).toBe(true);
});
