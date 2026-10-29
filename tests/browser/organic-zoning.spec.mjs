import {test,expect} from "@playwright/test";
async function screenPoint(page,p){
 return page.locator("#map").evaluate((el,p)=>{
  const r=el.getBoundingClientRect(),v=el.viewBox.baseVal;
  return{x:r.left+(p.x-v.x)*r.width/v.width,y:r.top+(p.y-v.y)*r.height/v.height};
 },p);
}
test("WORLD-UI-01: mobile zoning brush previews, commits and survives reload",async({page})=>{
 await page.goto("/");
 await page.locator("#menuBtn").click();
 await page.getByRole("button",{name:/Paint zoning/}).click();
 await page.getByRole("button",{name:"Paint Residential"}).click();
 await expect(page.locator("#zoneControls")).toBeVisible();
 const start=await screenPoint(page,{x:680,y:420}),end=await screenPoint(page,{x:728,y:421});
 await page.mouse.move(start.x,start.y);await page.mouse.down();
 await page.mouse.move(end.x,end.y,{steps:15});await page.mouse.up();
 await expect(page.locator("#map .zone-pending").first()).toBeVisible();
 await page.locator("#zoneCommit").click();
 await expect(page.locator("#zoneControls")).toBeHidden();
 const slot=await page.evaluate(()=>JSON.parse(localStorage.getItem("willow-valley:main:v1:slot:1")));
 expect(slot.state.zones.some(z=>z.type==="residential")).toBe(true);
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
 await page.goto("/");
 for(let i=0;i<2;i++)await page.locator("#nextBtn").click();
 await page.locator("#menuBtn").click();
 await page.getByRole("button",{name:/Housing demand/}).click();
 await expect(page.getByText("Homeless residents",{exact:true})).toBeVisible();
 await expect(page.getByText("Immigration attractiveness",{exact:true})).toBeVisible();
 await expect(page.getByText(/2 turn\(s\) before departure/)).toBeVisible();
});
