import {test,expect} from '@playwright/test';
for(const base of ['/','/dev/'])test('civic review choices keep four parks, four plazas and a large market separate from saved game state '+base,async({page})=>{
 test.setTimeout(60000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'ui-kit/wv006-baselines.html');await expect(page.locator('#catalog')).toHaveAttribute('data-loaded','18');
 await page.evaluate(()=>localStorage.setItem('wv006-civic-sentinel','keep'));const before=await page.evaluate(()=>JSON.stringify({...localStorage}));
 const market=await page.evaluate(()=>wv006.manifest.entries.find(e=>e.role==='market'));expect(market.civic.stalls).toHaveLength(12);expect(market.civic.activityZones.some(z=>z.kind==='stage')).toBe(true);expect(market.existingEnvelopeCheck.axisAlignedFit).toBe(true);
 await page.selectOption('#compare','new');await page.selectOption('#quality','normal');const dressed=await page.evaluate(()=>wv006.stats.triangles);await page.uncheck('#props');expect(await page.evaluate(()=>wv006.stats.triangles)).toBeLessThan(dressed);expect(await page.evaluate(()=>wv006.frameCheck())).toBe(true);await page.check('#props');
 const cards=page.locator('.leisure-card');await expect(cards).toHaveCount(8);const ids=await cards.evaluateAll(cards=>cards.map(c=>c.dataset.design));expect(ids.filter(id=>id.startsWith('park-'))).toHaveLength(4);expect(ids.filter(id=>id.startsWith('plaza-'))).toHaveLength(4);
 for(const id of ids){const card=page.locator('.leisure-card[data-design="'+id+'"]');await card.click();await expect(card).toHaveAttribute('aria-pressed','true');await expect(page.locator('#design')).toHaveValue(id);await expect(page.locator('#compare')).toHaveValue('new');await expect(page.locator('#kind')).toContainText('PUBLIC SPACE');expect(await page.locator('#compare option[value="pair"]').evaluate(option=>option.disabled)).toBe(true);
  for(const quality of ['normal','low']){await page.selectOption('#quality',quality);await page.selectOption('#view','roof');expect(await page.evaluate(()=>wv006.frameCheck()),id+' '+quality).toBe(true);}
 }
 await page.selectOption('#design','facility-market');expect(await page.locator('#compare option[value="pair"]').evaluate(option=>option.disabled)).toBe(false);expect(await page.evaluate(()=>JSON.stringify({...localStorage}))).toBe(before);expect(errors).toEqual([]);
});
