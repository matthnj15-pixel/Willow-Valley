import {test,expect} from "@playwright/test";

test("WV-GAME-001: Council switches tabs, changes fiscal policy, trades, and saves",async({page})=>{
 await page.goto("/?legacy=1");
 await expect(page.locator("#civicStatus")).toContainText("Founding Charter");
 await page.locator("#councilBtn").click();
 await expect(page.getByRole("heading",{name:"The Founding Charter"})).toBeVisible();
 await page.getByRole("button",{name:"Economy"}).click();
 await expect(page.getByText("Workers assigned",{exact:true})).toBeVisible();
 await page.getByRole("button",{name:/Heavy levy/}).click();
 let save=await page.evaluate(()=>JSON.parse(localStorage.getItem("willow-valley:main:v1:slot:1")).state);
 expect(save.civic.tax).toBe("high");
 await page.getByRole("button",{name:"Decisions"}).click();
 await page.getByRole("button",{name:/Purchase 32 food/}).click();
 save=await page.evaluate(()=>JSON.parse(localStorage.getItem("willow-valley:main:v1:slot:1")).state);
 expect(save.food).toBe(98);
 expect(save.civic.lastTrade).toBe(0);
 await expect(page.getByRole("button",{name:/Purchase 18 wood/})).toBeDisabled();
 await page.locator("#closeSheet").click();
 await page.reload();
 await page.locator("#councilBtn").click();
 await page.getByRole("button",{name:"Economy"}).click();
 await expect(page.getByRole("button",{name:/Heavy levy/})).toBeDisabled();
});

test("WV-GAME-002: Council petition appears after four monthly turns",async({page})=>{
 await page.goto("/?legacy=1");
 for(let i=0;i<4;i++)await page.locator("#nextBtn").click();
 await expect(page.locator("#civicStatus")).toContainText("Petition waiting");
 await page.locator("#councilBtn").click();
 await page.getByRole("button",{name:"Decisions"}).click();
 await expect(page.getByRole("heading",{name:"Families on the Road"})).toBeVisible();
 await page.getByRole("button",{name:/Ask for a toll/}).click();
 await expect(page.getByRole("heading",{name:"No unanswered petitions"})).toBeVisible();
 const state=await page.evaluate(()=>JSON.parse(localStorage.getItem("willow-valley:main:v1:slot:1")).state);
 expect(state.civic.petitions).toContain("travelers");
});
