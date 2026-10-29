import {test,expect} from "@playwright/test";

test("WORLD-3D-UI-01: Development menu opens the standalone World Builder",async({page})=>{
 await page.goto("/?preview=1");
 await page.locator("#menuBtn").click();
 await page.getByRole("button",{name:/New World · 3D terrain generator/}).click();
 await expect(page).toHaveURL(/\/world-lab\/$/);
 await expect(page.getByRole("heading",{name:"Design the terrain"})).toBeVisible();
 await expect(page.locator("#worldCanvas")).toBeVisible();
 await expect(page.locator("#worldStats .stat")).toHaveCount(6);
});
test("WORLD-3D-UI-02: map size, water settings and seed survive blueprint save without replacing settlement",async({page})=>{
 await page.goto("/world-lab/");
 await expect(page.locator("#worldStats")).toContainText("1,200 × 900");
 await page.locator("#size").selectOption("large");
 await page.locator("#lakes").evaluate(el=>{
  el.value="4";el.dispatchEvent(new Event("input",{bubbles:true}));
 });
 await page.locator("#rivers").evaluate(el=>{
  el.value="0";el.dispatchEvent(new Event("input",{bubbles:true}));
 });
 await page.locator("#forest").evaluate(el=>{
  el.value="0";el.dispatchEvent(new Event("input",{bubbles:true}));
 });
 await page.locator("#seed").fill("A-TEST-VALLEY");
 await page.locator("#generate").click();
 await expect(page.locator("#worldStats")).toContainText("1,800 × 1,350");
 await expect(page.locator("#worldStats")).toContainText("Rivers");
 await expect(page.locator("#worldStats")).toContainText("Lakes");
 await expect(page.locator("#worldStats")).toContainText("Trees");
 await page.locator("#saveBlueprint").click();
 await expect(page.locator("#worldStatus")).toContainText("World blueprint saved");
 const data=await page.evaluate(()=>({
  blueprint:JSON.parse(localStorage.getItem("willow-valley:dev:world-blueprint-v1")),
  game:localStorage.getItem("willow-valley:dev:v1:slot:1")
 }));
 expect(data.blueprint.options.seed).toBe("A-TEST-VALLEY");
 expect(data.blueprint.options.size).toBe("large");
 expect(data.blueprint.options.lakes).toBe(4);
 expect(data.blueprint.options.rivers).toBe(0);
 expect(data.blueprint.options.forest).toBe(0);
 expect(data.game).toBeNull();
 await page.reload();
 await expect(page.locator("#seed")).toHaveValue("A-TEST-VALLEY");
 await expect(page.locator("#size")).toHaveValue("large");
 await expect(page.locator("#lakes")).toHaveValue("4");
});
test("WORLD-3D-UI-03: controls generate an explorable WebGL terrain where supported",async({page})=>{
 await page.goto("/world-lab/");
 await expect(page.locator("#worldStats .stat")).toHaveCount(6);
 await expect(page.locator("#worldStatus")).toContainText("Generated");
 const info=await page.locator("#worldCanvas").evaluate(canvas=>{
  const gl=canvas.getContext("webgl");
  return{supported:!!gl,width:canvas.width,height:canvas.height};
 });
 if(info.supported){
  expect(info.width).toBeGreaterThan(100);
  expect(info.height).toBeGreaterThan(100);
  await page.locator("#zoomIn").click();
  await page.locator("#resetCamera").click();
  await expect(page.locator("#rendererError")).toBeHidden();
 }else await expect(page.locator("#rendererError")).toBeVisible();
});
