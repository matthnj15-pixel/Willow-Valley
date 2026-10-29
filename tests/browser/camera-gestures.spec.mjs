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
test("WORLD-CAMERA-UI-01: pan with two fingers in the 3D game",async({page})=>{
 await page.goto("/?preview=1");
 await expect(page.locator("#stage")).toHaveClass(/is-3d/);
 const r=await touchPair(page,[[[-70,0],[70,0]],[[-40,0],[100,0]],[[-15,0],[125,0]]]);
 expect(r.unchanged).toBe(true);
 expect(Math.hypot(r.after.x-r.original.x,r.after.z-r.original.z)).toBeGreaterThan(20);
 expect(r.after.pitch).toBeCloseTo(r.original.pitch,3);
 expect(r.after.yaw).toBeCloseTo(r.original.yaw,3);
});
test("WORLD-CAMERA-UI-02: pinch zoom anchors scene in place",async({page})=>{
 await page.goto("/?preview=1");
 const r=await touchPair(page,[[[-60,0],[60,0]],[[-90,0],[90,0]],[[-110,0],[110,0]]]);
 expect(r.after.zoom).toBeLessThan(r.original.zoom);
 expect(r.after.pitch).toBeCloseTo(r.original.pitch,3);
 expect(r.unchanged).toBe(true);
});
test("WORLD-CAMERA-UI-03: twisting rotates the view without changing the simulation",async({page})=>{
 await page.goto("/?preview=1");
 const r=await touchPair(page,[[[-70,0],[70,0]],[[-70,25],[70,-25]],[[-70,38],[70,-38]]]);
 expect(Math.abs(r.after.yaw-r.original.yaw)).toBeGreaterThan(.25);
 expect(r.after.pitch).toBeCloseTo(r.original.pitch,3);
 expect(r.unchanged).toBe(true);
});
test("WORLD-CAMERA-UI-04: two-finger vertical swipe changes camera viewing angle",async({page})=>{
 await page.goto("/?preview=1");
 const r=await touchPair(page,[[[-60,0],[60,0]],[[-60,20],[60,20]],[[-60,60],[60,60]]]);
 expect(r.after.pitch).toBeGreaterThan(r.original.pitch+.13);
 expect(r.after.yaw).toBeCloseTo(r.original.yaw,3);
 expect(r.after.zoom).toBeCloseTo(r.original.zoom,3);
 await expect(page.locator("#cameraAngle")).toBeVisible();
});
test("WORLD-CAMERA-UI-05: navigating while in Zone doesn't paint or leave a stray stroke",async({page})=>{
 await page.goto("/?preview=1");
 await page.locator("#zoneBtn").click();
 const r=await touchPair(page,[[[-60,0],[60,0]],[[-35,0],[85,0]],[[-15,0],[105,0]]]);
 expect(r.unchanged).toBe(true);
 expect(r.painted).toBe(0);
 await expect(page.locator("#zoneCommit")).toBeDisabled();
});
test("WORLD-CAMERA-UI-06: reset camera returns to the town home angle",async({page})=>{
 await page.goto("/?preview=1");
 await touchPair(page,[[[-55,0],[55,0]],[[-55,30],[55,30]],[[-55,70],[55,70]]]);
 await page.locator("#reset3DCamera").click();
 const camera=await page.locator("#stage").evaluate(el=>el.dataset);
 expect(Number(camera.cameraPitch)).toBeCloseTo(.86,3);
 expect(Number(camera.cameraYaw)).toBeCloseTo(.71,3);
});
