import {test,expect} from '@playwright/test';

test('terrain contact: deterministic ridge, curved slope, junction and hill foundation screenshots',async({page},testInfo)=>{
 await page.goto('/?preview=1');
 await expect(page.locator('#game3D')).toHaveAttribute('data-terrain-contact','triangle-grid');
 await page.evaluate(async()=>{
  const {mountWorld3D}=await import('/ui-kit/render-3d.mjs');
  const canvas=document.createElement('canvas');canvas.id='contactScene';
  canvas.style='position:fixed;inset:0;width:100vw;height:100vh;z-index:9999';
  document.body.append(canvas);
  const world={width:400,depth:300,options:{size:'small'},trees:[],slope:()=>.15,
   sample:(x,y)=>({height:8+20*Math.exp(-Math.pow((x-200)/24,2))+.04*y,water:null})};
  const graph={hubId:1,nodes:[{id:1,x:30,y:140},{id:2,x:200,y:140},
   {id:3,x:365,y:140},{id:4,x:290,y:255}],segments:[{id:5,a:1,b:2,control:null},
   {id:6,a:2,b:3,control:null},{id:7,a:2,b:4,control:{x:310,y:155}}]};
  const renderer=mountWorld3D(canvas,world,{quality:'lite',interactive:false});
  renderer.setSettlement({roadGraph:graph,houses:[{x:205,y:85,orientation:.3,foundedTurn:0}],
   buildings:[],roads:[],zones:[],desirePaths:[],turn:1});
  renderer.focusOn(200,140,160);
  window.contactRenderer=renderer;
 });
 await expect(page.locator('#contactScene')).toHaveAttribute('data-terrain-contact','triangle-grid');
 await page.screenshot({path:testInfo.outputPath('ridge-junction-foundation.png')});
 await page.evaluate(()=>window.contactRenderer.navigateTouches({yawDelta:1.1,pitchDelta:-.4,zoomRatio:1}));
 await page.screenshot({path:testInfo.outputPath('downhill-curved-road.png')});
 await testInfo.attach('ridge-junction-foundation',{path:testInfo.outputPath('ridge-junction-foundation.png'),contentType:'image/png'});
 await testInfo.attach('downhill-curved-road',{path:testInfo.outputPath('downhill-curved-road.png'),contentType:'image/png'});
});

test('terrain contact modules remain available for a 3D offline relaunch',async({page,context})=>{
 await page.goto('/?preview=1');
 await expect(page.locator('#game3D')).toHaveAttribute('data-terrain-contact','triangle-grid');
 await page.evaluate(async()=>{
  await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;
 });
 await expect.poll(()=>page.evaluate(async()=>{
  const cache=await caches.open((await caches.keys()).find(k=>k.startsWith('willow-valley:')));
  return !!(await cache.match('/terrain-surface.mjs'))&&!!(await cache.match('/foundation-system.mjs'));
 })).toBe(true);
 await context.setOffline(true);
 await page.reload();
 await expect(page.locator('#game3D')).toHaveAttribute('data-terrain-contact','triangle-grid');
 await expect(page.locator('#stage')).toHaveClass(/is-3d/);
});
