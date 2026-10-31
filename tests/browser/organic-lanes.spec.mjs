const gameURL=process.env.WV_RENDERER==='three'?'/?preview=1&renderer=three':'/?preview=1';
import {test,expect} from "@playwright/test";

async function mapScreen(page,point){
 return page.locator("#map").evaluate((el,p)=>{
  const rect=el.getBoundingClientRect(),view=el.viewBox.baseVal;
  return{x:rect.left+(p.x-view.x)*rect.width/view.width,
   y:rect.top+(p.y-view.y)*rect.height/view.height};
 },point);
}
async function stored(page){
 return page.evaluate(()=>{
  const base="willow-valley:dev:v1",slot=Number(JSON.parse(localStorage.getItem(base+":active-slot"))||1);
  return JSON.parse(localStorage.getItem(base+":slot:"+slot))?.state;
 });
}

test("WORLD-002: a committed painted residential area grows a nonuniform cottage with a safe footpath and survives reload",async({page})=>{
 await page.goto("/?preview=1&legacy=1");
 const original=await stored(page);
 expect(original.houses).toHaveLength(4);
 await page.locator("#menuBtn").click();
 await page.getByRole("button",{name:/Paint zoning/}).click();
 await page.getByRole("button",{name:"Paint Residential"}).click();
 const point=await mapScreen(page,{x:705,y:425});
 await page.mouse.click(point.x,point.y);
 await expect(page.locator("#zoneCommit")).toBeEnabled();
 await page.locator("#zoneCommit").click();
 let state=await stored(page);
 expect(state.zones).toHaveLength(1);
 expect(state.houses).toHaveLength(4);
 await page.locator("#nextBtn").click();
 await page.locator("#nextBtn").click();
 state=await stored(page);
 expect(state.houses.length).toBeGreaterThan(4);
 expect(state.houses.at(-1).parcel.vertices.length).toBeGreaterThanOrEqual(5);
 expect(state.localLanes.at(-1).points.length).toBeGreaterThanOrEqual(2);
 expect(state.roadGraph).toEqual(original.roadGraph);
 await page.reload();
 const restored=await stored(page);
 expect(restored.houses).toEqual(state.houses);
 expect(restored.localLanes).toEqual(state.localLanes);
 expect(restored.zones).toEqual(state.zones);
});

test("WORLD-002: pending zone painting can be cancelled without modifying the save",async({page})=>{
 await page.goto("/?preview=1&legacy=1");
 const before=await stored(page);
 await page.locator("#menuBtn").click();
 await page.getByRole("button",{name:/Paint zoning/}).click();
 await page.getByRole("button",{name:"Paint Residential"}).click();
 const point=await mapScreen(page,{x:705,y:425});
 await page.mouse.click(point.x,point.y);
 await page.locator("#zoneCancel").click();
 await expect(page.locator("#zoneCommit")).toBeDisabled();
 const after=await stored(page);
 expect(after.zones).toEqual(before.zones);
 expect(after.houses).toEqual(before.houses);
});
