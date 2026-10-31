import {test,expect} from "@playwright/test";

test("BOOT-01: a working development game dismisses its startup screen after drawing",async({page})=>{
 await page.goto("/?preview=1");
 await expect(page.locator("#stage")).toHaveClass(/is-3d/);
 await expect(page.locator("#game3D")).toBeVisible();
 await expect(page.locator("#startupScreen")).toBeHidden();
 await expect(page.locator("#terrainLoad")).toBeHidden();
});

test("BOOT-02: a failed engine import shows retry controls instead of a broken-looking page",async({page})=>{
 await page.route(/\/app\.mjs(?:\?.*)?$/,route=>route.fulfill({
  status:503,contentType:"text/javascript",body:"Module temporarily unavailable"
 }));
 await page.goto("/?preview=1");
 await expect(page.locator("#startupScreen")).toBeVisible();
 await expect(page.locator("#startupStatus")).toContainText("could not finish loading");
 await expect(page.locator("#startupRetry")).toBeVisible();
 await expect(page.locator("#startupLite")).toBeVisible();
});

test("BOOT-03: lightweight rendering is selectable without erasing existing save slots",async({page})=>{
 await page.goto("/?preview=1");
 await expect(page.locator("#startupScreen")).toBeHidden();
 const before=await page.evaluate(()=>localStorage.getItem("willow-valley:dev:v1:slot:1"));
 await page.goto("/?preview=1&lite=1");
 await expect(page.locator("#game3D")).toBeVisible();
 await expect(page.locator("#startupScreen")).toBeHidden();
 const after=await page.evaluate(()=>localStorage.getItem("willow-valley:dev:v1:slot:1"));
 // Save timestamps can change at boot; the actual settlement must remain the same.
 const first=JSON.parse(before),next=JSON.parse(after);
 expect(next.state).toEqual(first.state);
});
