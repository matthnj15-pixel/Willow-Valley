import {test,expect} from "@playwright/test";

// Mobile smoke checks cover the main game rather than a stand-alone editor.
test("CITYRT-UI-01: advancing a turn surfaces a visible development digest and journal",async({page})=>{
 await page.goto("/?preview=1");
 await expect(page.locator("#stage")).toHaveClass(/is-3d/);
 await page.locator("#nextBtn").click();
 await expect(page.locator("#monthHighlights")).not.toBeEmpty();
 await page.locator("#historyBtn").click();
 await expect(page.locator("#sheetTitle")).toContainText("Valley history");
 await expect(page.locator("#sheetBody")).toContainText("This month");
});
test("CITYRT-UI-02: second touch cancels an unfinished road gesture without changing the save",async({page})=>{
 await page.goto("/?preview=1");
 await page.locator("#roadsBtn").click();
 const result=await page.locator("#map").evaluate(svg=>{
  Object.defineProperty(svg,"setPointerCapture",{value:()=>{},configurable:true});
  const rect=svg.getBoundingClientRect(),x=rect.left+rect.width*.62,y=rect.top+rect.height*.56;
  const send=(kind,id,dx,dy)=>svg.dispatchEvent(new PointerEvent(kind,{
   bubbles:true,cancelable:true,pointerId:id,pointerType:"touch",isPrimary:id===1,
   clientX:x+dx,clientY:y+dy,button:0
  }));
  const before=localStorage.getItem("willow-valley:dev:v1:slot:1");
  send("pointerdown",1,0,0);
  send("pointerdown",2,85,0);
  send("pointermove",1,20,30);
  send("pointermove",2,100,28);
  send("pointerup",2,100,28);
  send("pointerup",1,20,30);
  return{unchanged:before===localStorage.getItem("willow-valley:dev:v1:slot:1"),
   guides:Number(document.querySelector("#game3D").dataset.roadEditorMarkers)};
 });
 expect(result.unchanged).toBe(true);
 expect(result.guides).toBeGreaterThan(0);
 await expect(page.locator("#confirmRoad")).toBeDisabled();
});
