import test from 'node:test';import assert from 'node:assert/strict';
import {renderPreferences} from '../render-preferences.mjs';
test('opt-in renderer and quality survive a PWA start URL without entering save slots',()=>{
 const data=new Map([['save-slot','unchanged']]),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
 assert.deepEqual(renderPreferences('',storage,'graphics'),{renderer:'webgl',quality:'normal'});assert.equal(data.size,1);
 assert.deepEqual(renderPreferences('?renderer=three&quality=low',storage,'graphics'),{renderer:'three',quality:'low'});
 assert.deepEqual(renderPreferences('',storage,'graphics'),{renderer:'three',quality:'low'});assert.equal(data.get('save-slot'),'unchanged');
 assert.equal(renderPreferences('?renderer=webgl',storage,'graphics').renderer,'webgl');assert.equal(data.size,2);
});
test('invalid or denied preferences preserve query opt-in and safe defaults',()=>{
 const storage={getItem:()=>{throw Error('denied');},setItem:()=>{throw Error('denied');}};
 assert.deepEqual(renderPreferences('?renderer=three&quality=low',storage,'graphics'),{renderer:'three',quality:'low'});
 assert.deepEqual(renderPreferences('?renderer=unknown&quality=ultra',storage,'graphics'),{renderer:'webgl',quality:'normal'});
});
