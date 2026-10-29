import {test,expect} from "@playwright/test";

test("WORLD-3D-UI-01: Development menu opens the standalone World Builder",async({page})=>{
 await page.goto("/?preview=1");
 await page.locator("#menuBtn").click();
 await page.getByRole("button",{name:/New World · 3D terrain generator/}).click();
 await expect(page).toHaveURL(/\/ui-kit\/world-lab\.html$/);
 await expect(page.getByRole("heading",{name:"Design the terrain"})).toBeVisible();
 await expect(page.locator("#worldCanvas")).toBeVisible();
 await expect(page.locator("#worldStats .stat")).toHaveCount(6);
});
test("WORLD-3D-UI-02: map size, water settings and seed survive blueprint save without replacing settlement",async({page})=>{
 await page.goto("/ui-kit/world-lab.html");
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
 await page.locator("#applySettings").click();
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
 await page.goto("/ui-kit/world-lab.html");
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

test("WORLD-3D-UI-04: World Builder is available through the existing Pages-published UI Kit path",async({page})=>{
 const response=await page.goto("/ui-kit/world-lab.html");
 expect(response.status()).toBe(200);
 await expect(page.getByRole("heading",{name:"Design the terrain"})).toBeVisible();
 await expect(page.locator("#worldStats .stat")).toHaveCount(6);
 const scripts=await page.locator("script[src]").evaluateAll(nodes=>nodes.map(n=>n.getAttribute("src")));
 expect(scripts).toContain("./world-lab.mjs");
 await page.getByRole("link",{name:"Back to valley"}).click();
 await expect(page).toHaveURL(/\/$/);
 await expect(page.locator("#gameDock")).toBeVisible();
});

test("WORLD-3D-UI-06: generate new changes seed while updating preview keeps the seed",async({page})=>{
 await page.goto("/ui-kit/world-lab.html");
 const before=await page.locator("#seed").inputValue();
 await page.locator("#generate").click();
 const next=await page.locator("#seed").inputValue();
 expect(next).not.toBe(before);
 await page.locator("#applySettings").click();
 expect(await page.locator("#seed").inputValue()).toBe(next);
 await page.locator("#showReference").check();
 await expect(page.locator("#showReference")).toBeChecked();
});
test("WORLD-3D-UI-07: Development shows a direct World Builder link",async({page})=>{
 await page.goto("/?preview=1");
 await expect(page.locator("#worldBuilderLink")).toBeVisible();
 await page.locator("#worldBuilderLink").click();
 await expect(page).toHaveURL(/\/ui-kit\/world-lab\.html$/);
});

test("WORLD-3D-UI-08: actual glTF asset importer renders a mocked valid GLB without affecting seed",async({page})=>{
 const model=(()=>{
  const json={asset:{version:"2.0"},scene:0,scenes:[{nodes:[0]}],
   nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0},indices:1,material:0}]}],
   materials:[{pbrMetallicRoughness:{baseColorFactor:[.3,.8,.4,1]}}],
   accessors:[
    {bufferView:0,componentType:5126,count:3,type:"VEC3"},
    {bufferView:1,componentType:5123,count:3,type:"SCALAR"}],
   bufferViews:[{buffer:0,byteOffset:0,byteLength:36},{buffer:0,byteOffset:36,byteLength:6}],
   buffers:[{byteLength:44}]};
  const text=Buffer.from(JSON.stringify(json));
  const jsonChunk=Buffer.concat([text,Buffer.alloc((4-text.length%4)%4,32)]);
  const binary=Buffer.alloc(44);
  const positions=[0,0,0,1,0,0,0,2,0];
  positions.forEach((v,i)=>binary.writeFloatLE(v,i*4));
  [0,1,2].forEach((v,i)=>binary.writeUInt16LE(v,36+i*2));
  const header=Buffer.alloc(12),chunkA=Buffer.alloc(8),chunkB=Buffer.alloc(8);
  header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);
  header.writeUInt32LE(12+8+jsonChunk.length+8+binary.length,8);
  chunkA.writeUInt32LE(jsonChunk.length,0);chunkA.writeUInt32LE(0x4E4F534A,4);
  chunkB.writeUInt32LE(binary.length,0);chunkB.writeUInt32LE(0x004E4942,4);
  return Buffer.concat([header,chunkA,jsonChunk,chunkB,binary]);
 })();
 await page.route("**/packs/**/*.glb",route=>route.fulfill({
  status:200,contentType:"model/gltf-binary",
  headers:{"access-control-allow-origin":"*"},body:model
 }));
 await page.goto("/ui-kit/world-lab.html");
 await expect(page.locator("#assetStatus")).toContainText("Kenney models loaded: 5/5",{timeout:15000});
 await expect(page.locator("#rendererError")).toBeHidden();
 const stamp=await page.locator("#seed").inputValue();
 await page.locator("#applySettings").click();
 expect(await page.locator("#seed").inputValue()).toBe(stamp);
});

test("WORLD-3D-UI-09: Development's menu and header use the identical canonical World Builder destination",async({page})=>{
 await page.goto("/?preview=1");
 const href=await page.locator("#worldBuilderLink").getAttribute("href");
 expect(href).toContain("/ui-kit/world-lab.html");
 await page.locator("#menuBtn").click();
 await page.getByRole("button",{name:/New World · 3D terrain generator/}).click();
 await expect(page).toHaveURL(href);
 await expect(page.getByRole("heading",{name:"Design the terrain"})).toBeVisible();
});
test("WORLD-3D-UI-10: old World Builder location redirects to the working published route under a service worker",async({page})=>{
 await page.goto("/");
 await page.evaluate(async()=>{
  await navigator.serviceWorker.register("./sw.js",{scope:"./"});
  await navigator.serviceWorker.ready;
  if(!navigator.serviceWorker.controller)await new Promise(resolve=>{
   navigator.serviceWorker.addEventListener("controllerchange",resolve,{once:true});
  });
 });
 await page.goto("/world-lab/");
 await expect(page).toHaveURL(/\/ui-kit\/world-lab\.html$/);
 await expect(page.getByRole("heading",{name:"Design the terrain"})).toBeVisible();
});
