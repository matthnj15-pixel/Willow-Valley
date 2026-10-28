import {test,expect} from "@playwright/test";

async function toScreen(page,p){
 return page.locator("#map").evaluate((el,p)=>{
  const rect=el.getBoundingClientRect(),v=el.viewBox.baseVal;
  return{x:rect.left+(p.x-v.x)/v.width*rect.width,y:rect.top+(p.y-v.y)/v.height*rect.height};
 },p);
}
async function tapMap(page,p){const screen=await toScreen(page,p);await page.mouse.click(screen.x,screen.y);}
async function holdDrag(page,from,delta){
 const pos=await toScreen(page,from);
 await page.mouse.move(pos.x,pos.y);
 await page.mouse.down();
 await page.waitForTimeout(475);
 await page.mouse.move(pos.x+delta.x,pos.y+delta.y,{steps:10});
 await page.mouse.up();
}
async function extendFrom(page,p){
 await tapMap(page,p);
 await page.getByRole("button",{name:"Extend road from here"}).click();
}
const preview=page=>page.locator('#map path[stroke="#fbd18d"]');
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem("willow-valley:main:v1")));

test.beforeEach(async({page})=>{
 await page.goto("/");
 await page.locator("#roadsBtn").click();
});
test("WV-ROAD-002 AC-01: original road exposes persistent junction nodes",async({page})=>{
 await expect(page.locator('#map circle[fill="#d6e4ce"]')).toHaveCount(4);
 await tapMap(page,{x:330,y:417});
 await expect(page.getByText("Existing road junction",{exact:true})).toBeVisible();
 await expect(page.getByRole("button",{name:"Extend road from here"})).toBeVisible();
});
test("regression straight-by-default and sharp corners in the existing network",async({page})=>{
 await extendFrom(page,{x:460,y:454});
 await tapMap(page,{x:660,y:454});
 await tapMap(page,{x:660,y:590});
 expect(await preview(page).getAttribute("d")).toBe("M 460 454 L 660 454 L 660 590");
});
test("WV-ROAD-002 AC-04: tap to branch and reconnect to another existing node",async({page})=>{
 await extendFrom(page,{x:460,y:454});
 await tapMap(page,{x:480,y:320});
 await tapMap(page,{x:656,y:383});
 await page.locator("#confirmRoad").click();
 const state=await saved(page);
 expect(state.roadGraph.nodes).toHaveLength(5);
 expect(state.roadGraph.segments).toHaveLength(5);
 expect(state.gold).toBeLessThan(740);
});
test("WV-ROAD-002 AC-05: one hold-and-drag creates a curve without second tap",async({page})=>{
 await extendFrom(page,{x:460,y:454});
 await holdDrag(page,{x:560,y:325},{x:95,y:75});
 expect(await preview(page).getAttribute("d")).toContain(" Q ");
 await page.locator("#confirmRoad").click();
 const state=await saved(page);
 expect(state.roadGraph.segments.at(-1).control).not.toBeNull();
 await page.reload();
 const persisted=await saved(page);
 expect(persisted.roadGraph.segments.at(-1).control).toEqual(state.roadGraph.segments.at(-1).control);
});
test("regression draft bend, undo, and continued quick-swipe panning",async({page})=>{
 await extendFrom(page,{x:460,y:454});
 await tapMap(page,{x:680,y:454});
 await holdDrag(page,{x:570,y:454},{x:0,y:-55});
 expect(await preview(page).getAttribute("d")).toContain(" Q ");
 await page.locator("#undoRoad").click();
 expect(await preview(page).getAttribute("d")).not.toContain(" Q ");
 const before=await page.locator("#map").getAttribute("viewBox");
 const point=await toScreen(page,{x:570,y:454});
 await page.mouse.move(point.x,point.y);await page.mouse.down();
 await page.mouse.move(point.x-80,point.y+32,{steps:2});await page.mouse.up();
 expect(await page.locator("#map").getAttribute("viewBox")).not.toBe(before);
 expect(await preview(page).getAttribute("d")).not.toContain(" Q ");
});
test("WV-ROAD-002 AC-06: completed curve stays editable by hold-and-drag",async({page})=>{
 await extendFrom(page,{x:460,y:454});
 await holdDrag(page,{x:560,y:325},{x:95,y:75});
 await page.locator("#confirmRoad").click();
 const earlier=await saved(page);
 const handle=page.locator('#map circle[fill="#f3b969"]').last();
 const cx=Number(await handle.getAttribute("cx")),cy=Number(await handle.getAttribute("cy"));
 await holdDrag(page,{x:cx,y:cy},{x:0,y:45});
 const after=await saved(page);
 expect(after.roadGraph.segments.at(-1).control).not.toEqual(earlier.roadGraph.segments.at(-1).control);
 expect(after.gold).toBe(earlier.gold);
});
test("WV-ROAD-002 AC-03: existing junction deletion has no direct cost but disconnects production",async({page})=>{
 const beforeGold=Number((await page.locator("#gold").innerText()).replace(/,/g,""));
 await tapMap(page,{x:330,y:417});
 page.once("dialog",dialog=>dialog.accept());
 await page.getByRole("button",{name:/Destroy this junction/}).click();
 const after=await saved(page);
 expect(after.gold).toBe(beforeGold);
 expect(after.roadGraph.segments.length).toBe(1);
 await page.locator("#nextBtn").click();
 const next=await saved(page);
 expect(next.report).toContain("+0 food");
 expect(next.report).toContain("+0 wood");
});
test("WV-ROAD-002 AC-07: insert intersection on an existing segment",async({page})=>{
 await tapMap(page,{x:250,y:445});
 await page.getByRole("button",{name:/Insert a junction here/}).click();
 const state=await saved(page);
 expect(state.roadGraph.nodes.length).toBe(5);
 expect(state.roadGraph.segments.length).toBe(4);
 await tapMap(page,{x:242,y:330});
 await page.locator("#confirmRoad").click();
 expect((await saved(page)).roadGraph.segments).toHaveLength(5);
});
