import test from "node:test";
import assert from "node:assert/strict";
import {worldBuilderUrl} from "../world-route.mjs";

test("WORLD-ROUTE-01: Development GitHub Pages points to the actual deployed builder",()=>{
 assert.equal(worldBuilderUrl("https://matthnj15-pixel.github.io/Willow-Valley/dev/app.mjs"),
  "https://matthnj15-pixel.github.io/Willow-Valley/dev/ui-kit/world-lab.html");
});
test("WORLD-ROUTE-02: root Pages preview query cannot accidentally link to absent stable files",()=>{
 assert.equal(worldBuilderUrl("https://matthnj15-pixel.github.io/Willow-Valley/app.mjs"),
  "https://matthnj15-pixel.github.io/Willow-Valley/dev/ui-kit/world-lab.html");
});
test("WORLD-ROUTE-03: local Playwright development still serves the local fixture",()=>{
 assert.equal(worldBuilderUrl("http://127.0.0.1:4173/app.mjs"),
  "http://127.0.0.1:4173/ui-kit/world-lab.html");
});
