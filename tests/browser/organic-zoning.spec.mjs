import {test,expect} from "@playwright/test";
async function screenPoint(page,p){
 return page.locator("#map").evaluate((el,p)=>{
  const r=el.getBoundingClientRect(),v=el.viewBox.baseVal;
  return{x:r.left+(p.x-v.x)*r.width/v.width,y:r.top+(p.y-v.y)*r.height/v.height};
 },p);
}
test("WORLD-UI-01: mobile zoning brush previews, commits and survives reload",async({page})=>{
 await page.goto("/?legacy=1");
 await page.locator("#zoneBtn").click();
 await expect(page.locator("#zoneBtn")).toHaveAttribute("aria-pressed","true");
 await expect(page.locator("#zoneType")).toHaveValue("residential");
 await page.locator("#zoneRadius").evaluate(el=>{
  el.value="72";el.dispatchEvent(new Event("input",{bubbles:true}));
 });
 await expect(page.locator("#zoneRadiusValue")).toHaveText("72");
 await expect(page.locator("#zoneControls")).toBeVisible();
 const start=await screenPoint(page,{x:680,y:420}),end=await screenPoint(page,{x:728,y:421});
 await page.mouse.move(start.x,start.y);await page.mouse.down();
 await page.mouse.move(end.x,end.y,{steps:15});await page.mouse.up();
 await expect(page.locator("#map .zone-pending")).toHaveCount(1);
 await expect(page.locator("#map .zone-pending")).toHaveAttribute("stroke-dasharray","7 6");
 await page.locator("#zoneCommit").click();
 await expect(page.locator("#zoneControls")).toBeHidden();
 const slot=await page.evaluate(()=>JSON.parse(localStorage.getItem("willow-valley:main:v1:slot:1")));
 expect(slot.state.zones.some(z=>z.type==="residential"&&z.radius===72)).toBe(true);
 await page.reload();
 await expect(page.locator("#map .zone-committed").first()).toBeVisible();
 await page.locator("#nextBtn").click();
 await page.locator("#nextBtn").click();
 const after=await page.evaluate(()=>JSON.parse(localStorage.getItem("willow-valley:main:v1:slot:1")).state);
 expect(after.houses.length).toBeGreaterThan(4);
 expect(after.houses.at(-1).parcel.vertices.length).toBeGreaterThanOrEqual(5);
 expect(after.houses.at(-1).parcel.vertices.length).toBeLessThanOrEqual(8);
 expect(after.localLanes.at(-1).entrance).toBeTruthy();
 expect(after.localLanes.length).toBeGreaterThan(0);
});
test("WORLD-UI-02: housing outlook shows vacancy, unsheltered demand and attractiveness",async({page})=>{
 await page.goto("/?legacy=1");
 for(let i=0;i<2;i++)await page.locator("#nextBtn").click();
 await page.locator("#menuBtn").click();
 await page.getByRole("button",{name:/Housing demand/}).click();
 await expect(page.getByText("Homeless residents",{exact:true})).toBeVisible();
 await expect(page.getByText("Immigration attractiveness",{exact:true})).toBeVisible();
 await expect(page.getByText(/2 turn\(s\) before departure/)).toBeVisible();
});

test("WORLD-UI-04: Eraser shortcut cuts a small saved stroke, then resumes brush",async({page})=>{
 await page.goto("/?legacy=1");
 await page.locator("#zoneBtn").click();
 let pos=await screenPoint(page,{x:610,y:605});
 await page.mouse.click(pos.x,pos.y);
 await page.locator("#zoneCommit").click();
 await page.locator("#zoneBtn").click();
 await page.locator("#zoneEraser").click();
 await expect(page.locator("#zoneType")).toHaveValue("erase");
 await expect(page.locator("#zoneEraser")).toHaveAttribute("aria-pressed","true");
 await page.locator("#zoneRadius").evaluate(el=>{
  el.value="24";el.dispatchEvent(new Event("input",{bubbles:true}));
 });
 pos=await screenPoint(page,{x:620,y:605});
 await page.mouse.click(pos.x,pos.y);
 await page.locator("#zoneCommit").click();
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem("willow-valley:main:v1:slot:1")).state);
 expect(before.zones.map(z=>z.type)).toEqual(["residential","erase"]);
 expect(before.zones.at(-1).radius).toBe(24);
 await page.reload();
 await page.locator("#zoneBtn").click();
 await page.locator("#zoneEraser").click();
 await expect(page.locator("#zoneType")).toHaveValue("erase");
 await page.locator("#zoneEraser").click();
 await expect(page.locator("#zoneType")).toHaveValue("residential");
});
test("WORLD-UI-05: two-finger navigation pans and pinches without paint",async({page})=>{
 await page.goto("/?legacy=1");
 await page.locator("#zoneBtn").click();
 await page.locator("#zoomIn").click();
 const data=await page.locator("#map").evaluate(svg=>{
  // Pointer events simulate two independent active touches. The stub only
  // bypasses browser pointer-capture requirements for synthetic events.
  Object.defineProperty(svg,"setPointerCapture",{value:()=>{},configurable:true});
  const rect=svg.getBoundingClientRect(),x=rect.left+rect.width/2,y=rect.top+rect.height/2;
  const send=(kind,id,dx,dy)=>svg.dispatchEvent(new PointerEvent(kind,{
   bubbles:true,cancelable:true,pointerId:id,pointerType:"touch",isPrimary:id===41,
   clientX:x+dx,clientY:y+dy,button:0
  }));
  const view=()=>[svg.viewBox.baseVal.x,svg.viewBox.baseVal.y,svg.viewBox.baseVal.width];
  const before=view();
  send("pointerdown",41,-50,0);
  send("pointerdown",42,50,0);
  send("pointermove",41,-10,0);
  send("pointermove",42,90,0);
  const panned=view(),pendingDuringPan=svg.querySelectorAll(".zone-pending").length;
  send("pointermove",42,115,0);
  const zoomed=view();
  send("pointerup",41,-10,0);
  send("pointermove",42,125,0);
  const pendingAfterLift=svg.querySelectorAll(".zone-pending").length;
  send("pointerup",42,125,0);
  return{before,panned,zoomed,pendingDuringPan,pendingAfterLift};
 });
 expect(data.panned[0]).not.toBeCloseTo(data.before[0],1);
 expect(data.panned[2]).toBeCloseTo(data.before[2],1);
 expect(data.zoomed[2]).toBeLessThan(data.before[2]);
 expect(data.pendingDuringPan).toBe(0);
 expect(data.pendingAfterLift).toBe(0);
});
