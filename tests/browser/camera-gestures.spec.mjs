import {test,expect} from "@playwright/test";

// Synthetic pointer sequences use actual game event listeners. Camera data
// attributes are read-only instrumentation for UAT, never saved to a slot.
async function touchPair(page,steps){
 return page.locator("#map").evaluate((svg,steps)=>{
  Object.defineProperty(svg,"setPointerCapture",{value:()=>{},configurable:true});
  const rect=svg.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
  const beforeSlot=localStorage.getItem("willow-valley:dev:v1:slot:1");
  const camera=()=>{
   const d=document.querySelector("#stage").dataset;
   return{yaw:Number(d.cameraYaw),pitch:Number(d.cameraPitch),zoom:Number(d.cameraZoom),
    x:Number(d.cameraFocusX),z:Number(d.cameraFocusZ)};
  };
  const send=(kind,id,point)=>svg.dispatchEvent(new PointerEvent(kind,{
   bubbles:true,cancelable:true,pointerId:id,pointerType:"touch",isPrimary:id===71,
   clientX:cx+point[0],clientY:cy+point[1],button:0
  }));
  const original=camera(),initial=steps[0];
  send("pointerdown",71,initial[0]);send("pointerdown",72,initial[1]);
  for(const [a,b] of steps.slice(1)){
   send("pointermove",71,a);send("pointermove",72,b);
  }
  const after=camera();
  send("pointerup",71,steps.at(-1)[0]);send("pointerup",72,steps.at(-1)[1]);
  return{original,after,
   unchanged:beforeSlot===localStorage.getItem("willow-valley:dev:v1:slot:1"),
   painted:svg.querySelectorAll(".zone-pending").length};
 },steps);
}
test("WORLD-CAMERA-UI-01: horizontal two-finger motion rolls the trackball, not the camera focus",async({page})=>{
 await page.goto("/?preview=1");
 await expect(page.locator("#stage")).toHaveClass(/is-3d/);
 const r=await touchPair(page,[[[-70,0],[70,0]],[[-40,0],[100,0]],[[-15,0],[125,0]]]);
 expect(r.unchanged).toBe(true);
 expect(r.after.yaw).toBeLessThan(r.original.yaw-.12);
 expect(r.after.pitch).toBeCloseTo(r.original.pitch,2);
 expect(r.after.x).toBeCloseTo(r.original.x,3);
 expect(r.after.z).toBeCloseTo(r.original.z,3);
});
test("WORLD-CAMERA-UI-02: symmetrical two-finger pinch still zooms around the settlement",async({page})=>{
 await page.goto("/?preview=1");
 const r=await touchPair(page,[[[-60,0],[60,0]],[[-90,0],[90,0]],[[-110,0],[110,0]]]);
 expect(r.after.zoom).toBeLessThan(r.original.zoom);
 expect(Math.abs(r.after.pitch-r.original.pitch)).toBeLessThan(.055);
 expect(Math.abs(r.after.yaw-r.original.yaw)).toBeLessThan(.055);
 expect(r.unchanged).toBe(true);
});
test("WORLD-CAMERA-UI-03: twisting still rotates in the push direction",async({page})=>{
 await page.goto("/?preview=1");
 const r=await touchPair(page,[[[-70,0],[70,0]],[[-70,25],[70,-25]],[[-70,38],[70,-38]]]);
 expect(r.after.yaw-r.original.yaw).toBeGreaterThan(.24);
 expect(r.unchanged).toBe(true);
});
test("WORLD-CAMERA-UI-04: a diagonal two-finger swipe changes yaw and tilt together",async({page})=>{
 await page.goto("/?preview=1");
 const r=await touchPair(page,[[[-60,0],[60,0]],[[-40,20],[80,20]],[[-10,52],[110,52]]]);
 expect(r.after.yaw).toBeLessThan(r.original.yaw-.10);
 expect(r.after.pitch).toBeGreaterThan(r.original.pitch+.10);
 expect(r.after.zoom).toBeCloseTo(r.original.zoom,2);
 await expect(page.locator("#cameraAngle")).toBeVisible();
});
test("WORLD-CAMERA-UI-05: two-finger navigation cancels a started paint stroke",async({page})=>{
 await page.goto("/?preview=1");
 await page.locator("#zoneBtn").click();
 const r=await page.locator("#map").evaluate(svg=>{
  Object.defineProperty(svg,"setPointerCapture",{value:()=>{},configurable:true});
  const rect=svg.getBoundingClientRect(),cx=rect.left+rect.width*.52,cy=rect.top+rect.height*.5;
  const send=(kind,id,x,y)=>svg.dispatchEvent(new PointerEvent(kind,{bubbles:true,
   cancelable:true,pointerId:id,pointerType:"touch",isPrimary:id===71,
   clientX:cx+x,clientY:cy+y,button:0}));
  const saved=localStorage.getItem("willow-valley:dev:v1:slot:1");
  send("pointerdown",71,-70,0);
  send("pointermove",71,-50,7);
  send("pointermove",71,-28,14);
  send("pointerdown",72,70,0);
  send("pointermove",71,-4,42);
  send("pointermove",72,82,30);
  send("pointerup",72,82,30);
  send("pointerup",71,-4,42);
  return saved===localStorage.getItem("willow-valley:dev:v1:slot:1");
 });
 expect(r).toBe(true);
 await expect(page.locator("#zoneCommit")).toBeDisabled();
});
test("WORLD-CAMERA-UI-06: reset camera restores settlement viewing angle",async({page})=>{
 await page.goto("/?preview=1");
 await touchPair(page,[[[-55,0],[55,0]],[[-35,25],[75,25]],[[-5,60],[105,60]]]);
 await page.locator("#reset3DCamera").click();
 const camera=await page.locator("#stage").evaluate(el=>el.dataset);
 expect(Number(camera.cameraPitch)).toBeCloseTo(.86,3);
 expect(Number(camera.cameraYaw)).toBeCloseTo(.71,3);
});
test("WORLD-CAMERA-UI-07: one-finger exploring still pans the map",async({page})=>{
 await page.goto("/?preview=1");
 const original=await page.locator("#stage").evaluate(el=>({
  x:Number(el.dataset.cameraFocusX),z:Number(el.dataset.cameraFocusZ)}));
 await page.locator("#map").evaluate(svg=>{
  Object.defineProperty(svg,"setPointerCapture",{value:()=>{},configurable:true});
  const rect=svg.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
  const send=(kind,x,y)=>svg.dispatchEvent(new PointerEvent(kind,{bubbles:true,
   cancelable:true,pointerId:91,pointerType:"touch",isPrimary:true,
   clientX:cx+x,clientY:cy+y,button:0}));
  send("pointerdown",0,0);send("pointermove",75,15);send("pointerup",75,15);
 });
 const after=await page.locator("#stage").evaluate(el=>({
  x:Number(el.dataset.cameraFocusX),z:Number(el.dataset.cameraFocusZ)}));
 expect(Math.hypot(after.x-original.x,after.z-original.z)).toBeGreaterThan(12);
});
