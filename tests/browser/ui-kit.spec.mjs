import {test,expect} from "@playwright/test";

test("WV-UI-002: living catalog renders canonical palette and interactive variants",async({page})=>{
 await page.goto("/ui-kit/");
 await expect(page.locator(".kit-swatch")).toHaveCount(11);
 await expect(page.locator(".kit-swatch").first()).toContainText("#035352");
 await expect(page.locator(".kit-swatch").nth(1)).toContainText("#F3E8BC");
 await expect(page.locator("#buttonGallery .wv-btn")).toHaveCount(5);
 await page.getByRole("button",{name:"Open Map"}).first().click();
 await expect(page.locator("#buttonFeedback")).toContainText("Secondary button clicked");
 await page.getByRole("tab",{name:"Infrastructure"}).click();
 await expect(page.locator("#tabFeedback")).toContainText("Infrastructure");
 await expect(page.locator("#navigationGallery .wv-nav-tool.active")).toHaveCount(1);
});
test("WV-UI-002: build row, modal and toast are real interactive shared components",async({page})=>{
 await page.goto("/ui-kit/");
 await page.locator("#buildGallery .wv-build-row").first().click();
 await expect(page.locator("#modalBackdrop .wv-sheet-preview")).toBeVisible();
 await page.locator("#modalBackdrop .wv-btn--primary").click();
 await expect(page.locator("#modalBackdrop")).toBeHidden();
 await expect(page.locator("#toastGallery .wv-toast")).toContainText("House constructed!");
 await page.locator("#volume").evaluate(el=>{el.value="35";el.dispatchEvent(new Event("input",{bubbles:true}));});
 await expect(page.locator("#volumeValue")).toHaveText("35%");
});
test("WV-UI-002: catalog and embedded live game share actual resource and navigation styles",async({page})=>{
 await page.goto("/ui-kit/");
 const game=page.frameLocator('iframe[title="Live Willow Valley Development game"]');
 await expect(game.locator("#people")).toHaveText("32");
 await expect(game.locator("#resourceBar .wv-resource")).toHaveCount(5);
 await expect(game.locator("#gameDock .wv-nav-tool")).toHaveCount(3);
 const bg=await game.locator("#resourceBar .wv-resource").first().evaluate(el=>getComputedStyle(el).backgroundColor);
 const swatch=await page.locator("#resourceGallery .wv-resource").first().evaluate(el=>getComputedStyle(el).backgroundColor);
 expect(bg).toBe(swatch);
 const heights=await Promise.all([game.locator("#roadsBtn").evaluate(el=>getComputedStyle(el).minHeight),page.locator("#navigationGallery .wv-nav-tool").nth(1).evaluate(el=>getComputedStyle(el).minHeight)]);
 expect(heights[0]).toBe(heights[1]);
 await game.locator("#roadsBtn").click();
 await expect(game.locator("#roadControls")).toBeVisible();
 await game.locator("#buildBtn").click();
 await expect(game.locator("#sheetBody .wv-build-row").first()).toBeVisible();
});
test("WV-UI-002: installed local UI kit can reopen while disconnected",async({page,context})=>{
 await page.goto("/");
 await page.evaluate(async()=>{await navigator.serviceWorker.register("./sw.js",{scope:"./"});await navigator.serviceWorker.ready;});
 await expect.poll(async()=>page.evaluate(async()=>{const cache=await caches.open((await caches.keys()).find(k=>k.startsWith("willow-valley:")));return Boolean(await cache.match("./ui-kit/index.html"));})).toBe(true);
 await context.setOffline(true);
 await page.goto("/ui-kit/");
 await expect(page.getByRole("heading",{name:"Willow Valley UI Kit"})).toBeVisible();
 await expect(page.locator("#palette .kit-swatch")).toHaveCount(11);
});

test("WV-UI-002: Development game links directly to its living UI catalog",async({page})=>{
 await page.goto("/");
 await page.locator("#menuBtn").click();
 await expect(page.getByRole("link",{name:"Open the interactive Willow Valley design system"})).toBeVisible();
 await page.getByRole("link",{name:"Open the interactive Willow Valley design system"}).click();
 await expect(page).toHaveURL(/\/ui-kit\/$/);
 await expect(page.locator(".kit-hero h1")).toContainText("Willow Valley");
});
