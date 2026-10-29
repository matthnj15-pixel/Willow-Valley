import {test,expect} from "@playwright/test";

test("WORLD-PLAY-UI-01: fresh Development opens a playable 3D settlement",async({page})=>{
 await page.goto("/?preview=1");
 await expect(page.locator("#stage")).toHaveClass(/is-3d/);
 await expect(page.locator("#game3D")).toBeVisible();
 await expect(page.locator("#gameDock")).toBeVisible();
 const game=await page.evaluate(()=>{
  const item=JSON.parse(localStorage.getItem("willow-valley:dev:v1:slot:1"));
  return item?.state;
 });
 expect(game.worldOptions.size).toBe("medium");
 expect(game.worldOptions.seed).toBeTruthy();
 expect(game.roads.length).toBeGreaterThan(0);
 expect(game.houses.length).toBeGreaterThan(0);
 const width=await page.locator("#game3D").evaluate(canvas=>canvas.width);
 expect(width).toBeGreaterThan(200);
});
test("WORLD-PLAY-UI-02: founding in World Builder opens same seeded game in a chosen slot",async({page})=>{
 await page.goto("/ui-kit/world-lab.html");
 await page.locator("#size").selectOption("large");
 await page.locator("#profile").selectOption("pastoral");
 await page.locator("#lakes").evaluate(el=>{
  el.value="0";el.dispatchEvent(new Event("input",{bubbles:true}));
 });
 await page.locator("#rivers").evaluate(el=>{
  el.value="0";el.dispatchEvent(new Event("input",{bubbles:true}));
 });
 await page.locator("#seed").fill("FOUNDING-3D-VALLEY");
 await page.locator("#settlementSlot").selectOption("2");
 await page.locator("#foundSettlement").click();
 await expect(page).toHaveURL(/\?preview=1$/);
 await expect(page.locator("#stage")).toHaveClass(/is-3d/);
 await expect(page.locator("#game3D")).toBeVisible();
 const state=await page.evaluate(()=>{
  const data=JSON.parse(localStorage.getItem("willow-valley:dev:v1:slot:2"));
  return{game:data.state,active:JSON.parse(localStorage.getItem("willow-valley:dev:v1:active-slot"))};
 });
 expect(state.active).toBe(2);
 expect(state.game.worldOptions.seed).toBe("FOUNDING-3D-VALLEY");
 expect(state.game.worldOptions.size).toBe("large");
 expect(state.game.worldOptions.lakes).toBe(0);
 expect(state.game.worldOptions.rivers).toBe(0);
});
test("WORLD-PLAY-UI-03: legacy settlement remains editable and never auto-converts",async({page})=>{
 await page.goto("/?preview=1&legacy=1");
 await expect(page.locator("#stage")).not.toHaveClass(/is-3d/);
 const s=await page.evaluate(()=>{
  return JSON.parse(localStorage.getItem("willow-valley:dev:v1:slot:1"))?.state;
 });
 expect(s.worldOptions).toBeUndefined();
 await page.reload();
 await expect(page.locator("#stage")).not.toHaveClass(/is-3d/);
});
test("WORLD-PLAY-UI-04: 3D zoning and road tools are accessible in the main game",async({page})=>{
 await page.goto("/?preview=1");
 await page.locator("#zoneBtn").click();
 await expect(page.locator("#zoneControls")).toBeVisible();
 await page.locator("#zoneType").selectOption("residential");
 const rect=await page.locator("#map").boundingBox();
 expect(rect).toBeTruthy();
 const x=rect.x+rect.width*.51,y=rect.y+rect.height*.48;
 await page.mouse.move(x,y);await page.mouse.down();
 await page.mouse.move(x+25,y+14,{steps:4});await page.mouse.up();
 await expect(page.locator("#zoneCommit")).toBeEnabled();
 await page.locator("#zoneCommit").click();
 const zones=await page.evaluate(()=>{
  return JSON.parse(localStorage.getItem("willow-valley:dev:v1:slot:1")).state.zones;
 });
 expect(zones.length).toBeGreaterThan(0);
 await page.locator("#roadsBtn").click();
 await expect(page.locator("#roadControls")).toBeVisible();
 await expect(page.locator("#game3D")).toBeVisible();
});
