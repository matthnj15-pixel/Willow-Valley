import {test,expect} from "@playwright/test";

test("WV-SAVE-001: create independent settlement slots, switch and resume after reload",async({page})=>{
 await page.goto("/");
 await expect(page.locator("#calendar")).toContainText("Slot 1");
 await page.locator("#menuBtn").click();
 await page.getByRole("button",{name:"Manage 3 settlement slots"}).click();
 await expect(page.getByRole("button",{name:/Slot 2.*Empty/})).toBeVisible();
 await page.getByRole("button",{name:/Slot 2.*Empty/}).click();
 await expect(page.locator("#calendar")).toContainText("Slot 2");
 await page.locator("#nextBtn").click();
 await expect(page.locator("#calendar")).toContainText("April");
 await page.locator("#menuBtn").click();
 await page.getByRole("button",{name:"Manage 3 settlement slots"}).click();
 await expect(page.getByRole("button",{name:/Slot 1.*current/})).toHaveCount(0);
 await page.getByRole("button",{name:/Slot 1.*Year 1/}).click();
 await expect(page.locator("#calendar")).toContainText("March");
 await expect(page.locator("#calendar")).toContainText("Slot 1");
 await page.reload();
 await expect(page.locator("#calendar")).toContainText("Slot 1");
 const states=await page.evaluate(()=>({
  first:JSON.parse(localStorage.getItem("willow-valley:main:v1:slot:1")),
  second:JSON.parse(localStorage.getItem("willow-valley:main:v1:slot:2"))
 }));
 expect(states.first.state.turn).toBe(0);
 expect(states.second.state.turn).toBe(1);
 expect(states.second.events.some(e=>e.type==="turn_resolved")).toBe(true);
});
test("WV-SAVE-002: on reload original legacy save is copied into Slot 1 and preserved",async({page})=>{
 await page.goto("/");
 const old=await page.evaluate(()=>{
  const base="willow-valley:main:v1",slot=JSON.parse(localStorage.getItem(base+":slot:1"));
  slot.state.turn=24;slot.state.people=58;
  localStorage.setItem(base,JSON.stringify(slot.state));
  localStorage.removeItem(base+":slot:1");
  localStorage.removeItem(base+":active-slot");
  return localStorage.getItem(base);
 });
 await page.reload();
 await expect(page.locator("#calendar")).toContainText("Year 3");
 await expect(page.locator("#calendar")).toContainText("Slot 1");
 const values=await page.evaluate(()=>({
  old:localStorage.getItem("willow-valley:main:v1"),
  newSlot:JSON.parse(localStorage.getItem("willow-valley:main:v1:slot:1"))
 }));
 expect(values.old).toBe(old);
 expect(values.newSlot.state.turn).toBe(24);
 expect(values.newSlot.events[0].type).toBe("save_migration");
});
