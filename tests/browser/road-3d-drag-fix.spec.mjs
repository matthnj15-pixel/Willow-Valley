import {test,expect} from "@playwright/test";

test("ROAD-3D-FIX-UI: hold and drag stays proportional at phone zoom and never launches a far control",async({page})=>{
 await page.goto("/?preview=1");
 await expect(page.locator("#stage")).toHaveClass(/is-3d/);
 await page.locator("#roadsBtn").click();
 const result=await page.locator("#map").evaluate(async svg=>{
  Object.defineProperty(svg,"setPointerCapture",{value:()=>{},configurable:true});
  const bounds=svg.getBoundingClientRect(),x=bounds.left+bounds.width*.57,
   y=bounds.top+bounds.height*.56;
  const send=(kind,dx,dy)=>svg.dispatchEvent(new PointerEvent(kind,{
   bubbles:true,cancelable:true,pointerId:51,pointerType:"touch",isPrimary:true,
   clientX:x+dx,clientY:y+dy,button:0}));
  const canvas=document.querySelector("#game3D");
  const save=localStorage.getItem("willow-valley:dev:v1:slot:1");
  send("pointerdown",0,0);
  await new Promise(resolve=>setTimeout(resolve,440));
  send("pointermove",28,18);
  const near=Number(canvas.dataset.roadCurveRadius);
  send("pointermove",98,65);
  const medium=Number(canvas.dataset.roadCurveRadius);
  send("pointermove",280,200);
  const far=Number(canvas.dataset.roadCurveRadius);
  send("pointerup",280,200);
  return{near,medium,far,unchanged:save===localStorage.getItem("willow-valley:dev:v1:slot:1"),
   guides:Number(canvas.dataset.roadGuideTriangles)};
 });
 expect(result.near).toBeGreaterThan(0);
 expect(result.medium).toBeGreaterThan(result.near);
 expect(result.far).toBeLessThanOrEqual(75.001);
 expect(result.medium).toBeLessThanOrEqual(75.001);
 expect(result.unchanged).toBe(true);
 expect(result.guides).toBeGreaterThan(0);
});
