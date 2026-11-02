import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateAdoption} from '../scripts/validate-wv007-adoption.mjs';

const selection=()=>JSON.parse(readFileSync(new URL('../render-adoption/selection.json',import.meta.url)));

test('WV007 selected source manifests and actual bundles match the C4/A3/A1/B/D contract',()=>{
 const report=validateAdoption();assert.equal(report.architectureEntries,18);assert.equal(report.landscapeForms,20);assert.equal(report.runtimeReady,false);
});
test('WV007 rejects a stale selected source hash rather than silently following the latest filename',()=>{
 const plan=selection();plan.sources.buildings.manifestSha256='0'.repeat(64);
 assert.throws(()=>validateAdoption({selection:plan}),/Selected manifest changed/);
});
test('WV007 rejects duplicate architecture choices that could double-render a civic market',()=>{
 const plan=selection();plan.architecture.entryIds[0]=plan.architecture.entryIds[1];
 assert.throws(()=>validateAdoption({selection:plan}),/duplicate\/missing/);
});
test('WV007 rejects photographic A2 adoption and loss of plot awareness',()=>{
 const a=selection();a.environment.worldFactory='environment-next/materials.mjs';
 assert.throws(()=>validateAdoption({selection:a}),/A2 cannot/);
 const b=selection();b.landscape.required=false;
 assert.throws(()=>validateAdoption({selection:b}),/Plot awareness/);
});
