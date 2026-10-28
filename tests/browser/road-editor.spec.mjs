import {test,expect} from "@playwright/test";

async function toScreen(page,p){
  return page.locator("#map").evaluate((el,p)=>{
    const rect=el.getBoundingClientRect(),v=el.viewBox.baseVal;
    return{x:rect.left+(p.x-v.x)/v.width*rect.width,y:rect.top+(p.y-v.y)/v.height*rect.height};
  },p);
}
async function tapMap(page,p){const pos=await toScreen(page,p);await page.mouse.click(pos.x,pos.y);}
async function holdDrag(page,from,deltaY){
 const pos=await toScreen(page,from);
 await page.mouse.move(pos.x,pos.y);
 await page.mouse.down();
 await page.waitForTimeout(460);
 await page.mouse.move(pos.x,pos.y+deltaY,{steps:8});
 await page.mouse.up();
}
const preview=page=>page.locator('#map path[stroke="#fbd18d"]');
test.beforeEach(async({page})=>{
 await page.goto("/");
 await page.locator("#roadsBtn").click();
});
test("AC-01/02/06 straight road geometry remains angular",async({page})=>{
 await tapMap(page,{x:460,y:454});
 await tapMap(page,{x:660,y:454});
 await tapMap(page,{x:660,y:590});
 expect(await preview(page).getAttribute("d")).toBe("M 460 454 L 660 454 L 660 590");
});
test("AC-03/07/08 intentional bend, undo, build, and reload",async({page})=>{
 await tapMap(page,{x:460,y:454});
 await tapMap(page,{x:680,y:454});
 expect(await preview(page).getAttribute("d")).not.toContain(" Q ");
 await holdDrag(page,{x:570,y:454},-55);
 expect(await preview(page).getAttribute("d")).toContain(" Q ");
 await page.locator("#undoRoad").click();
 expect(await preview(page).getAttribute("d")).not.toContain(" Q ");
 await holdDrag(page,{x:570,y:454},-55);
 expect(await preview(page).getAttribute("d")).toContain(" Q ");
 await page.locator("#confirmRoad").click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("willow-valley:main:v1")));
 expect(saved.roads).toHaveLength(2);
 expect(saved.roads[1].length).toBeGreaterThan(2);
 expect(saved.gold).toBeLessThan(740);
 await page.reload();
 const after=await page.evaluate(()=>JSON.parse(localStorage.getItem("willow-valley:main:v1")));
 expect(after.roads[1]).toEqual(saved.roads[1]);
 expect(after.gold).toBe(saved.gold);
});
test("AC-05 ordinary swipe pans instead of bending draft road",async({page})=>{
 await tapMap(page,{x:460,y:454});
 await tapMap(page,{x:680,y:454});
 const before=await page.locator("#map").getAttribute("viewBox");
 const p=await toScreen(page,{x:570,y:454});
 await page.mouse.move(p.x,p.y);
 await page.mouse.down();
 await page.mouse.move(p.x-80,p.y+32,{steps:2});
 await page.mouse.up();
 expect(await preview(page).getAttribute("d")).not.toContain(" Q ");
 expect(await page.locator("#map").getAttribute("viewBox")).not.toEqual(before);
});
