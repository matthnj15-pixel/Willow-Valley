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

test("WORLD-PLAY-UI-05: reopen Save Slot 2 3D map after switching from Slot 1",async({page})=>{
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto("/ui-kit/world-lab.html");
 await page.locator("#size").selectOption("large");
 await page.locator("#profile").selectOption("pastoral");
 await page.locator("#seed").fill("SLOT-2-REOPEN-3D");
 await page.locator("#settlementSlot").selectOption("2");
 await page.locator("#foundSettlement").click();
 await expect(page.locator("#stage")).toHaveClass(/is-3d/);
 await expect(page.locator("#terrainLoad")).toBeHidden({timeout:20000});
 const before=await page.evaluate(()=>localStorage.getItem("willow-valley:dev:v1:slot:2"));
 await page.locator("#menuBtn").click();
 await page.getByRole("button",{name:/Manage 3 settlement slots/}).click();
 await page.getByRole("button",{name:/Slot 1 .* Empty/}).click();
 await expect(page.locator("#stage")).toHaveClass(/is-3d/);
 await page.locator("#menuBtn").click();
 await page.getByRole("button",{name:/Manage 3 settlement slots/}).click();
 await page.getByRole("button",{name:/Slot 2 .* SLOT-2-REOPEN-3D/}).click();
 await expect(page.locator("#stage")).toHaveClass(/is-3d/);
 await expect(page.locator("#terrainLoad")).toBeHidden({timeout:20000});
 await page.reload();
 await expect(page.locator("#stage")).toHaveClass(/is-3d/);
 await expect(page.locator("#terrainLoad")).toBeHidden({timeout:20000});
 const after=await page.evaluate(()=>localStorage.getItem("willow-valley:dev:v1:slot:2"));
 expect(JSON.parse(after).state).toEqual(JSON.parse(before).state);
 expect(errors).toEqual([]);
});
test("WORLD-PLAY-UI-06: WebGL failure offers a lightweight retry without changing Slot 2",async({page})=>{
 await page.goto("/?preview=1");
 await expect(page.locator("#terrainLoad")).toBeHidden({timeout:20000});
 const before=await page.evaluate(()=>localStorage.getItem("willow-valley:dev:v1:slot:1"));
 await page.locator("#game3D").evaluate(canvas=>
  canvas.dispatchEvent(new Event("webglcontextlost",{cancelable:true})));
 await expect(page.locator("#terrainLoad")).toBeVisible();
 await expect(page.locator("#retry3D")).toBeVisible();
 await page.locator("#retry3D").click();
 await expect(page.locator("#terrainLoad")).toBeHidden({timeout:20000});
 expect(await page.evaluate(()=>localStorage.getItem("willow-valley:dev:v1:slot:1"))).toBe(before);
 await expect(page.locator("#game3D")).toBeVisible();
});

test("ZONE-3D-013: Move, Paint and Erase share one uncommitted batch",async({page})=>{
 await page.goto("/?preview=1");
 await page.locator("#zoneBtn").click();
 await expect(page.locator("#zonePaint")).toHaveAttribute("aria-pressed","true");
 await page.locator("#zoneRadius").evaluate(el=>{
  el.value="24";el.dispatchEvent(new Event("input",{bubbles:true}));
 });
 const rect=await page.locator("#map").boundingBox();
 const x=rect.x+rect.width*.50,y=rect.y+rect.height*.50;
 const old=await page.evaluate(()=>JSON.parse(localStorage.getItem("willow-valley:dev:v1:slot:1")).state.zones);
 await page.mouse.click(x,y);
 await expect(page.locator("#game3D")).toHaveAttribute("data-pending-zoning","1");
 await page.locator("#zoneEraser").click();
 await expect(page.locator("#zoneEraser")).toHaveAttribute("aria-pressed","true");
 await page.mouse.click(x,y);
 await page.locator("#zoneType").selectOption("preserve");
 await expect(page.locator("#zonePaint")).toHaveAttribute("aria-pressed","true");
 await page.mouse.click(x,y);
 await expect(page.locator("#game3D")).toHaveAttribute("data-pending-zoning","3");
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("willow-valley:dev:v1:slot:1")).state.zones)).toEqual(old);
 await page.locator("#zoneMove").click();
 await expect(page.locator("#zoneMove")).toHaveAttribute("aria-pressed","true");
 const before=await page.locator("#stage").getAttribute("data-camera-focus-x");
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+75,y+22,{steps:4});await page.mouse.up();
 const after=await page.locator("#stage").getAttribute("data-camera-focus-x");
 expect(after).not.toEqual(before);
 await expect(page.locator("#game3D")).toHaveAttribute("data-pending-zoning","3");
 await page.locator("#zoneCommit").click();
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem("willow-valley:dev:v1:slot:1")).state.zones);
 expect(stored.slice(-3).map(z=>z.type)).toEqual(["residential","erase","preserve"]);
 await page.reload();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("willow-valley:dev:v1:slot:1")).state.zones)).toEqual(stored);
});
test("ZONE-3D-014: Undo and Cancel discard pending mixed edits without touching saves",async({page})=>{
 await page.goto("/?preview=1");
 const before=await page.evaluate(()=>localStorage.getItem("willow-valley:dev:v1:slot:1"));
 await page.locator("#zoneBtn").click();
 const rect=await page.locator("#map").boundingBox(),x=rect.x+rect.width*.50,y=rect.y+rect.height*.50;
 await page.mouse.click(x,y);
 await page.locator("#zoneEraser").click();await page.mouse.click(x,y);
 await expect(page.locator("#game3D")).toHaveAttribute("data-pending-zoning","2");
 await page.locator("#zoneUndo").click();
 await expect(page.locator("#game3D")).toHaveAttribute("data-pending-zoning","1");
 await page.locator("#zoneCancel").click();
 await expect(page.locator("#zoneCommit")).toBeDisabled();
 expect(await page.evaluate(()=>localStorage.getItem("willow-valley:dev:v1:slot:1"))).toBe(before);
});
test("ROAD-3D-015: junction nodes and constructed curve handle remain visible and editable",async({page})=>{
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto("/?preview=1");
 await page.locator("#roadsBtn").click();
 await expect.poll(async()=>Number(await page.locator("#game3D").getAttribute("data-road-guide-triangles"))).toBeGreaterThan(0);
 const initial=Number(await page.locator("#game3D").getAttribute("data-road-guide-triangles"));
 const saved=await page.evaluate(()=>{
  const key="willow-valley:dev:v1:slot:1",entry=JSON.parse(localStorage.getItem(key)),g=entry.state.roadGraph;
  const e=g.segments[1],a=g.nodes.find(n=>n.id===e.a),b=g.nodes.find(n=>n.id===e.b);
  e.control={x:(a.x+b.x)/2+20,y:(a.y+b.y)/2+25};
  localStorage.setItem(key,JSON.stringify(entry));
  return{id:e.id,control:e.control};
 });
 await page.reload();
 await page.locator("#roadsBtn").click();
 await expect.poll(async()=>Number(await page.locator("#game3D").getAttribute("data-road-guide-triangles"))).toBeGreaterThan(initial);
 const position=await page.evaluate(async id=>{
  const {createWorld}=await import("/world-gen.mjs");
  const state=JSON.parse(localStorage.getItem("willow-valley:dev:v1:slot:1")).state;
  const world=createWorld(state.worldOptions),e=state.roadGraph.segments.find(s=>s.id===id),
   a=state.roadGraph.nodes.find(n=>n.id===e.a),b=state.roadGraph.nodes.find(n=>n.id===e.b);
  const p={x:(a.x+b.x+2*e.control.x)/4,y:(a.y+b.y+2*e.control.y)/4};
  const rect=document.getElementById("map").getBoundingClientRect(),d=document.getElementById("stage").dataset;
  const yaw=Number(d.cameraYaw),pitch=Number(d.cameraPitch),zoom=Number(d.cameraZoom);
  const dx=p.x-world.width/2-Number(d.cameraFocusX),dz=p.y-world.depth/2-Number(d.cameraFocusZ),
   h=world.sample(p.x,p.y).height-17,cs=Math.cos(yaw),sn=Math.sin(yaw);
  const xx=cs*dx+sn*dz,zz=-sn*dx+cs*dz,yy=Math.cos(pitch)*h-Math.sin(pitch)*zz;
  return{x:rect.left+rect.width/2+xx/zoom*rect.height/2,
   y:rect.top+rect.height/2-yy/zoom*rect.height/2};
 },saved.id);
 const rect=await page.locator("#map").boundingBox();
 expect(position.x).toBeGreaterThan(rect.x+12);
 expect(position.x).toBeLessThan(rect.x+rect.width-12);
 expect(position.y).toBeGreaterThan(rect.y+12);
 expect(position.y).toBeLessThan(rect.y+rect.height-12);
 await page.mouse.move(position.x,position.y);await page.mouse.down();
 await page.mouse.move(position.x+24,position.y+38,{steps:5});
 await expect.poll(async()=>Number(await page.locator("#game3D").getAttribute("data-road-guide-triangles"))).toBeGreaterThan(initial);
 await page.mouse.up();
 const updated=await page.evaluate(id=>{
  const state=JSON.parse(localStorage.getItem("willow-valley:dev:v1:slot:1")).state;
  return state.roadGraph.segments.find(e=>e.id===id).control;
 },saved.id);
 expect(updated).not.toEqual(saved.control);
 expect(errors).toEqual([]);
});
